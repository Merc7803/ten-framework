import json
import sys
import types
import unittest
from unittest.mock import AsyncMock, patch

from pydantic import BaseModel

ten_runtime = types.ModuleType("ten_runtime")


class FakeAsyncExtension:
    def __init__(self, name):
        self.name = name


class FakeCmd:
    @staticmethod
    def create(_name):
        return FakeCmd()

    def set_property_string(self, _key, _value):
        return None


class FakeData:
    @staticmethod
    def create(_name):
        return FakeData()

    def set_property_from_json(self, _key, _value):
        return None


class FakeCmdResult:
    @staticmethod
    def create(_status_code):
        return FakeCmdResult()

    def get_property_to_json(self, _key):
        return "{}"


class FakeTenEnvBase:
    pass


class FakeLoc:
    def __init__(self, *args, **kwargs):
        pass


class FakeStatusCode:
    OK = "ok"
    ERROR = "error"


class FakeTenError(Exception):
    pass


class FakeAddon:
    pass


def fake_register_addon_as_extension(_name):
    def decorator(cls):
        return cls

    return decorator


ten_runtime.AsyncExtension = FakeAsyncExtension
ten_runtime.AsyncTenEnv = FakeTenEnvBase
ten_runtime.Cmd = FakeCmd
ten_runtime.CmdResult = FakeCmdResult
ten_runtime.Data = FakeData
ten_runtime.Loc = FakeLoc
ten_runtime.Addon = FakeAddon
ten_runtime.StatusCode = FakeStatusCode
ten_runtime.TenEnv = FakeTenEnvBase
ten_runtime.TenError = FakeTenError
ten_runtime.register_addon_as_extension = fake_register_addon_as_extension
sys.modules.setdefault("ten_runtime", ten_runtime)

ten_ai_base = types.ModuleType("ten_ai_base")
ten_ai_base.__path__ = []
ten_ai_base_const = types.ModuleType("ten_ai_base.const")
ten_ai_base_helper = types.ModuleType("ten_ai_base.helper")
ten_ai_base_struct = types.ModuleType("ten_ai_base.struct")
ten_ai_base_types = types.ModuleType("ten_ai_base.types")


class FakeAsyncQueue:
    def __init__(self):
        self.items = []

    async def put(self, item):
        self.items.append(item)

    async def flush(self):
        self.items.clear()


class FakeStruct(BaseModel):
    pass


class FakeLLMToolMetadata(BaseModel):
    @classmethod
    def model_validate_json(cls, _json):
        return cls()


class FakeLLMToolResult(BaseModel):
    pass


def fake_parse_llm_response(_value):
    return None


ten_ai_base_const.CMD_PROPERTY_RESULT = "result"
ten_ai_base_helper.AsyncQueue = FakeAsyncQueue
for struct_name in (
    "LLMMessage",
    "LLMMessageContent",
    "LLMMessageFunctionCall",
    "LLMMessageFunctionCallOutput",
    "LLMRequest",
    "LLMResponse",
    "LLMResponseMessageDelta",
    "LLMResponseMessageDone",
    "LLMResponseReasoningDelta",
    "LLMResponseReasoningDone",
    "LLMResponseToolCall",
):
    setattr(ten_ai_base_struct, struct_name, FakeStruct)
ten_ai_base_struct.parse_llm_response = fake_parse_llm_response
ten_ai_base_types.LLMToolMetadata = FakeLLMToolMetadata
ten_ai_base_types.LLMToolResult = FakeLLMToolResult
sys.modules.setdefault("ten_ai_base", ten_ai_base)
sys.modules.setdefault("ten_ai_base.const", ten_ai_base_const)
sys.modules.setdefault("ten_ai_base.helper", ten_ai_base_helper)
sys.modules.setdefault("ten_ai_base.struct", ten_ai_base_struct)
sys.modules.setdefault("ten_ai_base.types", ten_ai_base_types)

from ten_packages.extension.main_python.agent.events import (  # noqa: E402
    ASRResultEvent,
    LLMResponseEvent,
    UserJoinedEvent,
)
from ten_packages.extension.main_python.extension import (  # noqa: E402
    MainControlExtension,
)


class FakeTenEnv:
    def log_info(self, _message):
        return None


class FakeConfig:
    greeting = "Old greeting"


class CarAssistantBehaviorTest(unittest.IsolatedAsyncioTestCase):
    def _build_extension(self):
        extension = MainControlExtension("main_control")
        extension.ten_env = FakeTenEnv()
        extension.config = FakeConfig()
        extension.agent = AsyncMock()
        extension.session_id = "100"
        extension.turn_id = 0
        return extension

    async def test_user_joined_sends_fixed_car_assistant_greeting(self):
        extension = self._build_extension()
        sent_payloads = []

        async def fake_send_data(_ten_env, data_name, dest, payload=None):
            sent_payloads.append(
                {"data_name": data_name, "dest": dest, "payload": payload}
            )

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_user_joined(UserJoinedEvent())

        tts_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "tts_text_input"
        ]
        transcript_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "message"
            and item["payload"]["data_type"] == "transcribe"
        ]
        session_state_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "message"
            and item["payload"]["data_type"] == "car_session_state"
        ]

        expected = (
            "Xin ch\u00e0o b\u1ea1n, tr\u1ee3 l\u00fd \u1ea3o "
            "\u0111\u00e3 s\u1eb5n s\u00e0ng"
        )
        self.assertEqual(tts_payloads[0]["text"], expected)
        self.assertEqual(transcript_payloads[0]["text"], expected)
        self.assertEqual(session_state_payloads[0]["session_state"], "awake")

    async def test_sleeping_assistant_ignores_command_without_wake_word(self):
        extension = self._build_extension()
        extension.voice_awake = False
        extension._interrupt = AsyncMock()

        async def fake_send_data(_ten_env, _data_name, _dest, payload=None):
            return None

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_asr_result(
                ASRResultEvent(
                    text="b\u1eadt \u0111i\u1ec1u h\u00f2a",
                    final=True,
                    metadata={"session_id": "100"},
                )
            )

        extension.agent.queue_llm_input.assert_not_awaited()

    async def test_wake_word_with_inline_command_wakes_and_processes_command(self):
        extension = self._build_extension()
        extension.voice_awake = False
        extension._interrupt = AsyncMock()

        async def fake_send_data(_ten_env, _data_name, _dest, payload=None):
            return None

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_asr_result(
                ASRResultEvent(
                    text="hey ma m\u00f3t b\u1eadt \u0111i\u1ec1u h\u00f2a",
                    final=True,
                    metadata={"session_id": "100"},
                )
            )

        self.assertTrue(extension.voice_awake)
        queued_text = extension.agent.queue_llm_input.await_args.args[0]
        self.assertIn("b\u1eadt \u0111i\u1ec1u h\u00f2a", queued_text)

    async def test_user_input_sent_to_llm_includes_current_car_state(self):
        extension = self._build_extension()
        extension._interrupt = AsyncMock()
        extension.car_state["climate"]["fan"] = 2

        async def fake_send_data(_ten_env, _data_name, _dest, payload=None):
            return None

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_asr_result(
                ASRResultEvent(
                    text="t\u1ed1c \u0111\u1ed9 qu\u1ea1t b\u00e2y gi\u1edd l\u00e0 bao nhi\u00eau",
                    final=True,
                    metadata={"session_id": "100"},
                )
            )

        queued_text = extension.agent.queue_llm_input.await_args.args[0]
        self.assertIn("CURRENT_CAR_STATE", queued_text)
        self.assertIn('"fan": 2', queued_text)
        self.assertIn(
            "t\u1ed1c \u0111\u1ed9 qu\u1ea1t b\u00e2y gi\u1edd l\u00e0 bao nhi\u00eau",
            queued_text,
        )

    async def test_final_llm_json_sends_reply_to_tts_and_car_command_event(self):
        extension = self._build_extension()
        extension.turn_id = 1
        sent_payloads = []

        async def fake_send_data(_ten_env, data_name, dest, payload=None):
            sent_payloads.append(
                {"data_name": data_name, "dest": dest, "payload": payload}
            )

        response = {
            "reply": "\u0110\u00e3 b\u1eadt \u0111i\u1ec1u h\u00f2a.",
            "commands": [
                {
                    "target": "climate.ac",
                    "action": "set",
                    "value": True,
                }
            ],
        }

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_llm_response(
                LLMResponseEvent(
                    delta="",
                    text=json.dumps(response, ensure_ascii=False),
                    is_final=True,
                )
            )

        tts_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "tts_text_input"
        ]
        car_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "message"
            and item["payload"]["data_type"] == "car_command"
        ]

        self.assertEqual(
            tts_payloads[0]["text"],
            "\u0110\u00e3 b\u1eadt \u0111i\u1ec1u h\u00f2a.",
        )
        self.assertEqual(
            car_payloads[0]["commands"],
            [{"target": "climate.ac", "action": "set", "value": True}],
        )

    async def test_final_llm_json_updates_backend_car_state(self):
        extension = self._build_extension()
        extension.turn_id = 1

        async def fake_send_data(_ten_env, _data_name, _dest, payload=None):
            return None

        response = {
            "reply": "\u0110\u00e3 t\u0103ng qu\u1ea1t l\u00ean m\u1ee9c 2.",
            "commands": [
                {
                    "target": "climate.fan",
                    "action": "set",
                    "value": 2,
                }
            ],
        }

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_llm_response(
                LLMResponseEvent(
                    delta="",
                    text=json.dumps(response, ensure_ascii=False),
                    is_final=True,
                )
            )

        self.assertEqual(extension.car_state["climate"]["fan"], 2)

    async def test_fenced_legacy_climate_json_becomes_natural_reply_and_command(self):
        extension = self._build_extension()
        extension.turn_id = 1
        sent_payloads = []

        async def fake_send_data(_ten_env, data_name, dest, payload=None):
            sent_payloads.append(
                {"data_name": data_name, "dest": dest, "payload": payload}
            )

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_llm_response(
                LLMResponseEvent(
                    delta="",
                    text='```json\n{ "climate": { "temperature": 29 } }\n```',
                    is_final=True,
                )
            )

        tts_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "tts_text_input"
        ]
        transcript_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "message"
            and item["payload"]["data_type"] == "transcribe"
        ]
        car_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "message"
            and item["payload"]["data_type"] == "car_command"
        ]

        self.assertEqual(extension.car_state["climate"]["temperature"], 29)
        self.assertEqual(
            car_payloads[0]["commands"],
            [{"target": "climate.temperature", "action": "set", "value": 29}],
        )
        self.assertEqual(
            tts_payloads[0]["text"],
            "\u0110\u00e3 \u0111i\u1ec1u ch\u1ec9nh nhi\u1ec7t \u0111\u1ed9 th\u00e0nh 29 \u0111\u1ed9, b\u1ea1n c\u00f3 c\u1ea7n m\u00ecnh gi\u00fap \u0111\u1ee1 g\u00ec th\u00eam kh\u00f4ng?",
        )
        self.assertEqual(transcript_payloads[0]["text"], tts_payloads[0]["text"])
        self.assertNotIn("```", transcript_payloads[0]["text"])

    async def test_fenced_grouped_target_action_json_controls_fan(self):
        extension = self._build_extension()
        extension.turn_id = 1
        sent_payloads = []

        async def fake_send_data(_ten_env, data_name, dest, payload=None):
            sent_payloads.append(
                {"data_name": data_name, "dest": dest, "payload": payload}
            )

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_llm_response(
                LLMResponseEvent(
                    delta="",
                    text='```json\n{ "target": "climate", "action": { "fan": 2 } }\n```',
                    is_final=True,
                )
            )

        tts_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "tts_text_input"
        ]
        car_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "message"
            and item["payload"]["data_type"] == "car_command"
        ]

        self.assertEqual(extension.car_state["climate"]["fan"], 2)
        self.assertEqual(
            car_payloads[0]["commands"],
            [{"target": "climate.fan", "action": "set", "value": 2}],
        )
        self.assertEqual(
            tts_payloads[0]["text"],
            "Đã điều chỉnh quạt lên mức 2, bạn có cần mình giúp đỡ gì thêm không?",
        )
        self.assertNotIn("```", tts_payloads[0]["text"])

    async def test_fenced_grouped_target_action_json_controls_media_volume(self):
        extension = self._build_extension()
        extension.turn_id = 1
        sent_payloads = []

        async def fake_send_data(_ten_env, data_name, dest, payload=None):
            sent_payloads.append(
                {"data_name": data_name, "dest": dest, "payload": payload}
            )

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_llm_response(
                LLMResponseEvent(
                    delta="",
                    text='```json\n{ "target": "media", "action": { "volume": 50 } }\n```',
                    is_final=True,
                )
            )

        tts_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "tts_text_input"
        ]
        car_payloads = [
            item["payload"]
            for item in sent_payloads
            if item["data_name"] == "message"
            and item["payload"]["data_type"] == "car_command"
        ]

        self.assertEqual(extension.car_state["media"]["volume"], 50)
        self.assertEqual(
            car_payloads[0]["commands"],
            [{"target": "media.volume", "action": "set", "value": 50}],
        )
        self.assertEqual(
            tts_payloads[0]["text"],
            "Đã điều chỉnh âm lượng thành mức 50, bạn có cần mình giúp đỡ gì thêm không?",
        )
        self.assertNotIn("```", tts_payloads[0]["text"])

    async def test_fenced_legacy_section_json_controls_all_dashboard_targets(self):
        cases = [
            (
                '{ "climate": { "ac": true, "temperature": 29, "fan": 2 } }',
                [
                    {"target": "climate.ac", "action": "set", "value": True},
                    {"target": "climate.temperature", "action": "set", "value": 29},
                    {"target": "climate.fan", "action": "set", "value": 2},
                ],
                lambda extension: (
                    extension.car_state["climate"]["ac"],
                    extension.car_state["climate"]["temperature"],
                    extension.car_state["climate"]["fan"],
                ),
                (True, 29, 2),
            ),
            (
                '{ "media": { "volume": 50, "playback": true } }',
                [
                    {"target": "media.volume", "action": "set", "value": 50},
                    {"target": "media.playback", "action": "set", "value": True},
                ],
                lambda extension: (
                    extension.car_state["media"]["volume"],
                    extension.car_state["media"]["playing"],
                ),
                (50, True),
            ),
            (
                '{ "navigation": { "destination": "Hồ Gươm" } }',
                [
                    {
                        "target": "navigation.destination",
                        "action": "set",
                        "value": "Hồ Gươm",
                    },
                ],
                lambda extension: extension.car_state["navigation"]["destination"],
                "Hồ Gươm",
            ),
            (
                '{ "lights": { "headlights": true, "cabin": true } }',
                [
                    {"target": "lights.headlights", "action": "set", "value": True},
                    {"target": "lights.cabin", "action": "set", "value": True},
                ],
                lambda extension: (
                    extension.car_state["lights"]["headlights"],
                    extension.car_state["lights"]["cabin"],
                ),
                (True, True),
            ),
            (
                '{ "locks": { "doors": false } }',
                [
                    {"target": "locks.doors", "action": "set", "value": False},
                ],
                lambda extension: extension.car_state["locks"]["doorsLocked"],
                False,
            ),
            (
                '{ "windows": { "driver": 60, "passenger": 40 } }',
                [
                    {"target": "windows.driver", "action": "set", "value": 60},
                    {"target": "windows.passenger", "action": "set", "value": 40},
                ],
                lambda extension: (
                    extension.car_state["windows"]["driver"],
                    extension.car_state["windows"]["passenger"],
                ),
                (60, 40),
            ),
        ]

        for payload_text, expected_commands, read_state, expected_state in cases:
            with self.subTest(payload_text=payload_text):
                extension = self._build_extension()
                extension.turn_id = 1
                sent_payloads = []

                async def fake_send_data(_ten_env, data_name, dest, payload=None):
                    sent_payloads.append(
                        {"data_name": data_name, "dest": dest, "payload": payload}
                    )

                with patch(
                    "ten_packages.extension.main_python.extension._send_data",
                    fake_send_data,
                ):
                    await extension._on_llm_response(
                        LLMResponseEvent(
                            delta="",
                            text=f"```json\n{payload_text}\n```",
                            is_final=True,
                        )
                    )

                tts_payloads = [
                    item["payload"]
                    for item in sent_payloads
                    if item["data_name"] == "tts_text_input"
                ]
                car_payloads = [
                    item["payload"]
                    for item in sent_payloads
                    if item["data_name"] == "message"
                    and item["payload"]["data_type"] == "car_command"
                ]

                self.assertEqual(read_state(extension), expected_state)
                self.assertCountEqual(car_payloads[0]["commands"], expected_commands)
                self.assertNotIn("```", tts_payloads[0]["text"])


if __name__ == "__main__":
    unittest.main()
