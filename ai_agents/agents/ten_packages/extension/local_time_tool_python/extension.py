import json
from datetime import datetime
from zoneinfo import ZoneInfo

from ten_runtime import Cmd
from ten_runtime.async_ten_env import AsyncTenEnv
from ten_ai_base.llm_tool import AsyncLLMToolBaseExtension
from ten_ai_base.types import (
    LLMToolMetadata,
    LLMToolMetadataParameter,
    LLMToolResult,
    LLMToolResultLLMResult,
)


TOOL_NAME = "get_current_datetime"
VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh"
VIETNAM_LOCALE = "vi-VN"
WEEKDAYS_VI = [
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
    "Chủ Nhật",
]


def format_vietnam_datetime(now: datetime) -> dict:
    vietnam_now = now.astimezone(ZoneInfo(VIETNAM_TIMEZONE))
    return {
        "supported": True,
        "timezone": VIETNAM_TIMEZONE,
        "locale": VIETNAM_LOCALE,
        "time_24h": vietnam_now.strftime("%H:%M"),
        "date": vietnam_now.strftime("%d/%m/%Y"),
        "weekday": WEEKDAYS_VI[vietnam_now.weekday()],
        "iso": vietnam_now.isoformat(),
    }


def unsupported_timezone_response() -> dict:
    return {
        "supported": False,
        "timezone": VIETNAM_TIMEZONE,
        "locale": VIETNAM_LOCALE,
        "message": "Hiện tại mình chỉ hỗ trợ giờ Việt Nam.",
    }


class LocalTimeToolExtension(AsyncLLMToolBaseExtension):
    def __init__(self, name: str, now_provider=None) -> None:
        super().__init__(name)
        self.now_provider = now_provider or (
            lambda: datetime.now(ZoneInfo(VIETNAM_TIMEZONE))
        )

    async def on_start(self, ten_env: AsyncTenEnv) -> None:
        await super().on_start(ten_env)

    async def on_cmd(self, ten_env: AsyncTenEnv, cmd: Cmd) -> None:
        await super().on_cmd(ten_env, cmd)

    def get_tool_metadata(self, ten_env: AsyncTenEnv) -> list[LLMToolMetadata]:
        return [
            LLMToolMetadata(
                name=TOOL_NAME,
                description=(
                    "Get the current date, weekday, and time in Việt Nam. "
                    "Use this when the user asks what time it is, today's date, "
                    "or today's weekday. The first version only supports Việt Nam."
                ),
                parameters=[
                    LLMToolMetadataParameter(
                        name="timezone",
                        type="string",
                        description=(
                            "Optional timezone. Use Asia/Ho_Chi_Minh for Việt Nam. "
                            "Other timezones are not supported yet."
                        ),
                        required=False,
                    ),
                ],
            )
        ]

    async def run_tool(
        self, ten_env: AsyncTenEnv, name: str, args: dict
    ) -> LLMToolResult | None:
        if name != TOOL_NAME:
            return None

        timezone = str(args.get("timezone") or VIETNAM_TIMEZONE).strip()
        if timezone != VIETNAM_TIMEZONE:
            result = unsupported_timezone_response()
        else:
            result = format_vietnam_datetime(self.now_provider())

        return LLMToolResultLLMResult(
            type="llmresult",
            content=json.dumps(result, ensure_ascii=False),
        )
