import json
import re
import time
from typing import Literal, Optional

from .agent.decorators import agent_event_handler
from ten_runtime import (
    AsyncExtension,
    AsyncTenEnv,
    Cmd,
    Data,
)

from .agent.agent import Agent
from .agent.events import (
    ASRResultEvent,
    HTTPRequestEvent,
    LLMResponseEvent,
    ToolRegisterEvent,
    UserJoinedEvent,
    UserLeftEvent,
)
from .helper import _send_cmd, _send_data
from .config import MainControlConfig  # assume extracted from your base model

import uuid


CAR_GREETING = "Xin ch\u00e0o b\u1ea1n, tr\u1ee3 l\u00fd \u1ea3o \u0111\u00e3 s\u1eb5n s\u00e0ng"
CAR_IDLE_TIMEOUT_SECONDS = 30
WAKE_WORDS = ("hey marmot", "hey ma m\u00f3t", "hey ma mot")
ALLOWED_CAR_TARGETS = {
    "climate.ac",
    "climate.temperature",
    "climate.fan",
    "media.volume",
    "media.playback",
    "navigation.destination",
    "lights.headlights",
    "lights.cabin",
    "locks.doors",
    "windows.driver",
    "windows.passenger",
}


class MainControlExtension(AsyncExtension):
    """
    The entry point of the agent module.
    Consumes semantic AgentEvents from the Agent class and drives the runtime behavior.
    """

    def __init__(self, name: str):
        super().__init__(name)
        self.ten_env: AsyncTenEnv = None
        self.agent: Agent = None
        self.config: MainControlConfig = None

        self.stopped: bool = False
        self._rtc_user_count: int = 0
        self.sentence_fragment: str = ""
        self.tts_text_buffer: str = ""
        self.turn_id: int = 0
        self.session_id: str = "0"
        self.voice_awake: bool = True
        self.last_user_activity_ts: float = time.monotonic()

    def _current_metadata(self) -> dict:
        return {"session_id": self.session_id, "turn_id": self.turn_id}

    async def on_init(self, ten_env: AsyncTenEnv):
        self.ten_env = ten_env

        # Load config from runtime properties
        config_json, _ = await ten_env.get_property_to_json(None)
        self.config = MainControlConfig.model_validate_json(config_json)

        self.agent = Agent(ten_env)

        # Now auto-register decorated methods
        for attr_name in dir(self):
            fn = getattr(self, attr_name)
            event_type = getattr(fn, "_agent_event_type", None)
            if event_type:
                self.agent.on(event_type, fn)

    # === Register handlers with decorators ===
    @agent_event_handler(HTTPRequestEvent)
    async def _on_http_request(self, event: HTTPRequestEvent):
        if event.type != "cmd":
            return

        name = event.body.get("name", "")
        payload = event.body.get("payload", {})
        if name != "message":
            return

        text = str(payload.get("text", "")).strip()
        if not text:
            return

        await self._on_asr_result(
            ASRResultEvent(
                text=text,
                final=True,
                metadata=self._current_metadata(),
            )
        )

    @agent_event_handler(UserJoinedEvent)
    async def _on_user_joined(self, event: UserJoinedEvent):
        self._rtc_user_count += 1
        if self._rtc_user_count == 1:
            self.voice_awake = True
            self.last_user_activity_ts = time.monotonic()
            await self._send_to_tts(CAR_GREETING, True)
            await self._send_transcript("assistant", CAR_GREETING, True, 100)
            await self._send_car_session_state("awake")

    @agent_event_handler(UserLeftEvent)
    async def _on_user_left(self, event: UserLeftEvent):
        self._rtc_user_count -= 1

    @agent_event_handler(ToolRegisterEvent)
    async def _on_tool_register(self, event: ToolRegisterEvent):
        await self.agent.register_llm_tool(event.tool, event.source)

    @agent_event_handler(ASRResultEvent)
    async def _on_asr_result(self, event: ASRResultEvent):
        self.session_id = event.metadata.get("session_id", "100")
        stream_id = int(self.session_id)
        if not event.text:
            return

        text = event.text.strip()
        wake_detected, command_text = self._extract_wake_command(text)
        if wake_detected:
            self.voice_awake = True
            self.last_user_activity_ts = time.monotonic()
            await self._send_car_session_state("awake")
            text = command_text
        elif self._is_voice_idle_expired():
            self.voice_awake = False
            await self._send_car_session_state("sleeping")

        if not self.voice_awake:
            return

        if not text:
            await self._send_transcript("assistant", "M\u00ecnh \u0111ang nghe.", True, 100)
            return

        transcript_turn_id = self.turn_id + 1
        if event.final or len(text) > 2:
            await self._interrupt()
        if event.final:
            self.turn_id = transcript_turn_id
            self.last_user_activity_ts = time.monotonic()
            await self.agent.queue_llm_input(text)
        await self._send_transcript(
            "user",
            text,
            event.final,
            stream_id,
            message_turn_id=transcript_turn_id,
        )

    @agent_event_handler(LLMResponseEvent)
    async def _on_llm_response(self, event: LLMResponseEvent):
        if not event.is_final and event.type == "message":
            self.tts_text_buffer = event.text or (
                self.tts_text_buffer + event.delta
            )

        if event.is_final and event.type == "message":
            complete_text = event.text or self.tts_text_buffer
            assistant_text, car_commands = self._parse_car_assistant_response(
                complete_text
            )
            self.sentence_fragment = ""
            self.tts_text_buffer = ""
            await self._send_to_tts(assistant_text, True)
            if car_commands:
                await self._send_car_command_event(car_commands)
            await self._send_transcript(
                "assistant",
                assistant_text,
                True,
                100,
                data_type="text",
            )
            return

        await self._send_transcript(
            "assistant",
            event.text,
            event.is_final,
            100,
            data_type=("reasoning" if event.type == "reasoning" else "text"),
        )

    async def on_start(self, ten_env: AsyncTenEnv):
        ten_env.log_info("[MainControlExtension] on_start")

    async def on_stop(self, ten_env: AsyncTenEnv):
        ten_env.log_info("[MainControlExtension] on_stop")
        self.stopped = True
        if self.agent is not None:
            await self.agent.stop()

    async def on_cmd(self, ten_env: AsyncTenEnv, cmd: Cmd):
        await self.agent.on_cmd(cmd)

    async def on_data(self, ten_env: AsyncTenEnv, data: Data):
        await self.agent.on_data(data)

    # === helpers ===
    def _is_voice_idle_expired(self) -> bool:
        return (
            time.monotonic() - self.last_user_activity_ts
            >= CAR_IDLE_TIMEOUT_SECONDS
        )

    def _normalize_wake_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.lower()).strip(" ,.!?:;\t\r\n")

    def _extract_wake_command(self, text: str) -> tuple[bool, str]:
        normalized = self._normalize_wake_text(text)
        for wake_word in WAKE_WORDS:
            if normalized == wake_word:
                return True, ""
            if normalized.startswith(f"{wake_word} "):
                command = text[len(wake_word) :].strip(" ,.!?:;\t\r\n")
                return True, command
        return False, text

    def _parse_car_assistant_response(self, text: str) -> tuple[str, list[dict]]:
        try:
            payload = json.loads(text)
        except (TypeError, json.JSONDecodeError):
            return text, []

        if not isinstance(payload, dict):
            return text, []

        reply = str(payload.get("reply") or "").strip() or text
        commands = payload.get("commands", [])
        if not isinstance(commands, list):
            return reply, []

        valid_commands = []
        for command in commands:
            if not isinstance(command, dict):
                continue
            target = command.get("target")
            action = command.get("action")
            if target not in ALLOWED_CAR_TARGETS or not action:
                continue
            valid_commands.append(
                {
                    "target": target,
                    "action": action,
                    "value": command.get("value"),
                }
            )
        return reply, valid_commands

    async def _send_car_command_event(self, commands: list[dict]):
        await _send_data(
            self.ten_env,
            "message",
            "message_collector",
            {
                "data_type": "car_command",
                "message_id": f"car-command-{self.session_id}-{self.turn_id}",
                "role": "assistant",
                "text": json.dumps({"commands": commands}, ensure_ascii=False),
                "commands": commands,
                "text_ts": int(time.time() * 1000),
                "is_final": True,
                "stream_id": 100,
            },
        )

    async def _send_car_session_state(self, state: Literal["awake", "sleeping"]):
        await _send_data(
            self.ten_env,
            "message",
            "message_collector",
            {
                "data_type": "car_session_state",
                "message_id": f"car-session-{self.session_id}-{state}",
                "role": "system",
                "text": state,
                "session_state": state,
                "text_ts": int(time.time() * 1000),
                "is_final": True,
                "stream_id": 100,
            },
        )

    async def _send_transcript(
        self,
        role: str,
        text: str,
        final: bool,
        stream_id: int,
        data_type: Literal["text", "reasoning"] = "text",
        message_turn_id: Optional[int] = None,
    ):
        """
        Sends the transcript (ASR or LLM output) to the message collector.
        """
        turn_id = self.turn_id if message_turn_id is None else message_turn_id
        message_id = f"{role}-{data_type}-{self.session_id}-{turn_id}"
        if data_type == "text":
            await _send_data(
                self.ten_env,
                "message",
                "message_collector",
                {
                    "data_type": "transcribe",
                    "message_id": message_id,
                    "role": role,
                    "text": text,
                    "text_ts": int(time.time() * 1000),
                    "is_final": final,
                    "stream_id": stream_id,
                },
            )
        elif data_type == "reasoning":
            await _send_data(
                self.ten_env,
                "message",
                "message_collector",
                {
                    "data_type": "raw",
                    "message_id": message_id,
                    "role": role,
                    "text": json.dumps(
                        {
                            "type": "reasoning",
                            "data": {
                                "text": text,
                            },
                        }
                    ),
                    "text_ts": int(time.time() * 1000),
                    "is_final": final,
                    "stream_id": stream_id,
                },
            )
        self.ten_env.log_info(
            f"[MainControlExtension] Sent transcript: {role}, final={final}, text={text}"
        )

    async def _send_to_tts(self, text: str, is_final: bool):
        """
        Sends a sentence to the TTS system.
        """
        request_id = f"tts-request-{self.turn_id}"
        await _send_data(
            self.ten_env,
            "tts_text_input",
            "tts",
            {
                "request_id": request_id,
                "text": text,
                "text_input_end": is_final,
                "metadata": self._current_metadata(),
            },
        )
        self.ten_env.log_info(
            f"[MainControlExtension] Sent to TTS: is_final={is_final}, text={text}"
        )

    async def _interrupt(self):
        """
        Interrupts ongoing LLM and TTS generation. Typically called when user speech is detected.
        """
        self.sentence_fragment = ""
        self.tts_text_buffer = ""
        await self.agent.flush_llm()
        await _send_data(
            self.ten_env, "tts_flush", "tts", {"flush_id": str(uuid.uuid4())}
        )
        await _send_cmd(self.ten_env, "flush", "agora_rtc")
        self.ten_env.log_info("[MainControlExtension] Interrupt signal sent")
