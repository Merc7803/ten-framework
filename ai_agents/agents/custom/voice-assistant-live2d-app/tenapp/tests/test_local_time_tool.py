import asyncio
import importlib.util
import json
import sys
import types
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


AGENTS_ROOT = Path(__file__).resolve().parents[4]
TOOL_DIR = (
    AGENTS_ROOT
    / "ten_packages"
    / "extension"
    / "local_time_tool_python"
)


class _BaseType:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _install_runtime_stubs(addon_registry=None):
    ten_runtime = types.ModuleType("ten_runtime")
    ten_runtime.Addon = object
    ten_runtime.Cmd = object
    ten_runtime.TenEnv = object

    def register_addon_as_extension(name):
        def decorator(cls):
            if addon_registry is not None:
                addon_registry.append(name)
            return cls

        return decorator

    ten_runtime.register_addon_as_extension = register_addon_as_extension

    async_ten_env = types.ModuleType("ten_runtime.async_ten_env")
    async_ten_env.AsyncTenEnv = object

    ten_ai_base = types.ModuleType("ten_ai_base")

    config_module = types.ModuleType("ten_ai_base.config")
    config_module.BaseConfig = object

    types_module = types.ModuleType("ten_ai_base.types")
    types_module.LLMToolMetadata = _BaseType
    types_module.LLMToolMetadataParameter = _BaseType
    types_module.LLMToolResult = _BaseType
    types_module.LLMToolResultLLMResult = _BaseType

    llm_tool_module = types.ModuleType("ten_ai_base.llm_tool")

    class AsyncLLMToolBaseExtension:
        def __init__(self, name):
            self.name = name

        async def on_start(self, ten_env):
            return None

        async def on_cmd(self, ten_env, cmd):
            return None

    llm_tool_module.AsyncLLMToolBaseExtension = AsyncLLMToolBaseExtension

    sys.modules["ten_runtime"] = ten_runtime
    sys.modules["ten_runtime.async_ten_env"] = async_ten_env
    sys.modules["ten_ai_base"] = ten_ai_base
    sys.modules["ten_ai_base.config"] = config_module
    sys.modules["ten_ai_base.types"] = types_module
    sys.modules["ten_ai_base.llm_tool"] = llm_tool_module


def _load_module():
    _install_runtime_stubs()
    spec = importlib.util.spec_from_file_location(
        "local_time_tool_python.extension",
        TOOL_DIR / "extension.py",
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class LocalTimeToolTest(unittest.TestCase):
    def test_package_import_registers_addon_for_ten_loader(self):
        addon_registry = []
        _install_runtime_stubs(addon_registry)
        package_parent = str(TOOL_DIR.parent)
        previous_path = list(sys.path)

        for module_name in [
            "local_time_tool_python",
            "local_time_tool_python.addon",
        ]:
            sys.modules.pop(module_name, None)

        try:
            sys.path.insert(0, package_parent)
            __import__("local_time_tool_python")
        finally:
            sys.path = previous_path

        self.assertIn("local_time_tool_python", addon_registry)

    def test_formats_vietnam_datetime_with_weekday(self):
        module = _load_module()
        now = datetime(2026, 6, 18, 20, 15, tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))

        result = module.format_vietnam_datetime(now)

        self.assertEqual(result["supported"], True)
        self.assertEqual(result["timezone"], "Asia/Ho_Chi_Minh")
        self.assertEqual(result["locale"], "vi-VN")
        self.assertEqual(result["time_24h"], "20:15")
        self.assertEqual(result["date"], "18/06/2026")
        self.assertEqual(result["weekday"], "Thứ Năm")
        self.assertEqual(result["iso"], "2026-06-18T20:15:00+07:00")

    def test_registers_get_current_datetime_tool_metadata(self):
        module = _load_module()
        extension = module.LocalTimeToolExtension("local_time_tool_python")

        metadata = extension.get_tool_metadata(None)

        self.assertEqual(len(metadata), 1)
        self.assertEqual(metadata[0].name, "get_current_datetime")
        self.assertIn("Việt Nam", metadata[0].description)
        self.assertEqual(metadata[0].parameters[0].name, "timezone")
        self.assertEqual(metadata[0].parameters[0].required, False)

    def test_run_tool_returns_vietnam_datetime_json(self):
        module = _load_module()
        fixed_now = datetime(2026, 6, 18, 20, 15, tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))
        extension = module.LocalTimeToolExtension(
            "local_time_tool_python",
            now_provider=lambda: fixed_now,
        )

        result = asyncio.run(
            extension.run_tool(None, "get_current_datetime", {"timezone": "Asia/Ho_Chi_Minh"})
        )

        payload = json.loads(result.content)
        self.assertEqual(payload["supported"], True)
        self.assertEqual(payload["time_24h"], "20:15")
        self.assertEqual(payload["date"], "18/06/2026")
        self.assertEqual(payload["weekday"], "Thứ Năm")

    def test_run_tool_rejects_non_vietnam_timezone_for_now(self):
        module = _load_module()
        extension = module.LocalTimeToolExtension("local_time_tool_python")

        result = asyncio.run(
            extension.run_tool(None, "get_current_datetime", {"timezone": "Asia/Tokyo"})
        )

        payload = json.loads(result.content)
        self.assertEqual(payload["supported"], False)
        self.assertEqual(payload["timezone"], "Asia/Ho_Chi_Minh")
        self.assertIn("chỉ hỗ trợ giờ Việt Nam", payload["message"])


if __name__ == "__main__":
    unittest.main()
