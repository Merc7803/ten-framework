import unittest
from unittest.mock import patch

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


if __name__ == "__main__":
    unittest.main()
