import unittest
from unittest.mock import AsyncMock, patch

from ten_packages.extension.main_python.agent.events import (
    ASRResultEvent,
    HTTPRequestEvent,
    LLMResponseEvent,
    ToolRegisterEvent,
    UserJoinedEvent,
    UserLeftEvent,
)
from ten_packages.extension.main_python.extension import MainControlExtension


class FakeAgent:
    def __init__(self, ten_env):
        self.ten_env = ten_env
        self.registered = []

    def on(self, event_type, handler=None):
        self.registered.append((event_type, handler.__name__))
        return handler


class FakeConfig:
    @classmethod
    def model_validate_json(cls, _config_json):
        return cls()


class FakeTenEnv:
    async def get_property_to_json(self, _path):
        return "{}", None

    def log_info(self, _message):
        return None


class MainControlRegistrationTest(unittest.IsolatedAsyncioTestCase):
    async def test_on_init_registers_all_decorated_agent_event_handlers(self):
        with (
            patch(
                "ten_packages.extension.main_python.extension.Agent",
                FakeAgent,
            ),
            patch(
                "ten_packages.extension.main_python.extension.MainControlConfig",
                FakeConfig,
            ),
        ):
            extension = MainControlExtension("main_control")

            await extension.on_init(FakeTenEnv())

        registered_events = {event_type for event_type, _ in extension.agent.registered}

        self.assertEqual(
            registered_events,
            {
                HTTPRequestEvent,
                UserJoinedEvent,
                UserLeftEvent,
                ToolRegisterEvent,
                ASRResultEvent,
                LLMResponseEvent,
            },
        )

    async def test_asr_interim_and_final_share_one_transcript_message_id(self):
        extension = MainControlExtension("main_control")
        extension.ten_env = FakeTenEnv()
        extension.session_id = "100"
        extension.turn_id = 0
        extension.agent = AsyncMock()
        extension._interrupt = AsyncMock()

        sent_payloads = []

        async def fake_send_data(_ten_env, data_name, dest, payload=None):
            sent_payloads.append(
                {
                    "data_name": data_name,
                    "dest": dest,
                    "payload": payload,
                }
            )

        with patch(
            "ten_packages.extension.main_python.extension._send_data",
            fake_send_data,
        ):
            await extension._on_asr_result(
                ASRResultEvent(
                    text="Hello.",
                    final=False,
                    metadata={"session_id": "100"},
                )
            )
            await extension._on_asr_result(
                ASRResultEvent(
                    text="Hello.",
                    final=True,
                    metadata={"session_id": "100"},
                )
            )

        message_ids = [
            item["payload"]["message_id"]
            for item in sent_payloads
            if item["data_name"] == "message"
        ]

        self.assertEqual(message_ids, ["user-text-100-1", "user-text-100-1"])
        extension.agent.queue_llm_input.assert_awaited_once_with("Hello.")

    async def test_on_stop_is_safe_when_agent_was_never_initialized(self):
        extension = MainControlExtension("main_control")
        ten_env = FakeTenEnv()

        await extension.on_stop(ten_env)

        self.assertTrue(extension.stopped)


if __name__ == "__main__":
    unittest.main()
