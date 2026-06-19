import importlib
import builtins
import sys
import types
import unittest
from contextlib import contextmanager
from unittest.mock import AsyncMock


MODULE_NAME = "ten_packages.extension.weatherapi_tool_python.extension"


class FakeConfig:
    api_key = ""

    @classmethod
    async def create_async(cls, ten_env):
        return cls()


class FakeTenEnv:
    def __init__(self):
        self.info_logs = []
        self.debug_logs = []

    def log_info(self, message):
        self.info_logs.append(message)

    def log_debug(self, message):
        self.debug_logs.append(message)


class WeatherToolOptionalDependencyTest(unittest.IsolatedAsyncioTestCase):
    def tearDown(self):
        sys.modules.pop(MODULE_NAME, None)
        for name in (
            "aiohttp",
            "ten_runtime",
            "ten_runtime.async_ten_env",
            "ten_ai_base.config",
            "ten_ai_base.types",
            "ten_ai_base.llm_tool",
        ):
            sys.modules.pop(name, None)

    def _install_import_stubs(self):
        ten_runtime = types.ModuleType("ten_runtime")

        class Cmd:
            def get_name(self):
                return "tool_call"

        class Addon:
            pass

        class TenEnv:
            pass

        def register_addon_as_extension(_name):
            def decorator(cls):
                return cls

            return decorator

        ten_runtime.Addon = Addon
        ten_runtime.Cmd = Cmd
        ten_runtime.TenEnv = TenEnv
        ten_runtime.register_addon_as_extension = register_addon_as_extension
        sys.modules["ten_runtime"] = ten_runtime

        async_ten_env_module = types.ModuleType("ten_runtime.async_ten_env")

        class AsyncTenEnv:
            pass

        async_ten_env_module.AsyncTenEnv = AsyncTenEnv
        sys.modules["ten_runtime.async_ten_env"] = async_ten_env_module

        config_module = types.ModuleType("ten_ai_base.config")

        class BaseConfig:
            @classmethod
            async def create_async(cls, ten_env):
                return cls()

        config_module.BaseConfig = BaseConfig
        sys.modules["ten_ai_base.config"] = config_module

        types_module = types.ModuleType("ten_ai_base.types")

        class _BaseType:
            def __init__(self, **kwargs):
                self.__dict__.update(kwargs)

        types_module.LLMToolMetadata = _BaseType
        types_module.LLMToolMetadataParameter = _BaseType
        types_module.LLMToolResult = _BaseType
        types_module.LLMToolResultLLMResult = _BaseType
        sys.modules["ten_ai_base.types"] = types_module

        llm_tool_module = types.ModuleType("ten_ai_base.llm_tool")

        class AsyncLLMToolBaseExtension:
            def __init__(self, name):
                self.name = name

            async def on_start(self, _ten_env):
                return None

            async def on_cmd(self, _ten_env, _cmd):
                return None

        llm_tool_module.AsyncLLMToolBaseExtension = AsyncLLMToolBaseExtension
        sys.modules["ten_ai_base.llm_tool"] = llm_tool_module

    @contextmanager
    def _raise_import_error_for(self, module_name):
        original_import = builtins.__import__

        def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name == module_name:
                raise ImportError(f"No module named '{module_name}'")
            return original_import(name, globals, locals, fromlist, level)

        builtins.__import__ = guarded_import
        try:
            yield
        finally:
            builtins.__import__ = original_import

    async def test_import_without_aiohttp_keeps_extension_optional(self):
        sys.modules.pop(MODULE_NAME, None)
        sys.modules.pop("aiohttp", None)
        self._install_import_stubs()

        with self._raise_import_error_for("aiohttp"):
            module = importlib.import_module(MODULE_NAME)
        extension = module.WeatherToolExtension("weather")
        ten_env = FakeTenEnv()
        extension.on_start = AsyncMock(wraps=extension.on_start)

        original_super_on_start = module.AsyncLLMToolBaseExtension.on_start
        try:
            module.WeatherToolConfig.create_async = FakeConfig.create_async
            module.AsyncLLMToolBaseExtension.on_start = AsyncMock()

            await extension.on_init(ten_env)
            await extension.on_start(ten_env)
        finally:
            module.AsyncLLMToolBaseExtension.on_start = original_super_on_start

        self.assertIsNone(extension.session)
        self.assertTrue(
            any("disabled" in message.lower() for message in ten_env.info_logs)
        )


if __name__ == "__main__":
    unittest.main()
