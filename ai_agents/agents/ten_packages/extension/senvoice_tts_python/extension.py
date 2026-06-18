from typing import Optional

from ten_ai_base.tts2_http import (  # type: ignore
    AsyncTTS2HttpClient,
    AsyncTTS2HttpConfig,
    AsyncTTS2HttpExtension,
)
from ten_runtime import AsyncTenEnv  # type: ignore

from .config import SenvoiceTTSConfig
from .constants import DEFAULT_SAMPLE_RATE
from .senvoice_tts import SenvoiceTTSClient


class SenvoiceTTSExtension(AsyncTTS2HttpExtension):
    def __init__(self, name: str) -> None:
        super().__init__(name)
        self.config: Optional[SenvoiceTTSConfig] = None
        self.client: Optional[SenvoiceTTSClient] = None

    async def create_config(self, config_json_str: str) -> AsyncTTS2HttpConfig:
        return SenvoiceTTSConfig.model_validate_json(config_json_str)

    async def create_client(
        self, config: AsyncTTS2HttpConfig, ten_env: AsyncTenEnv
    ) -> AsyncTTS2HttpClient:
        return SenvoiceTTSClient(config=config, ten_env=ten_env)

    def vendor(self) -> str:
        return "senvoice"

    def synthesize_audio_sample_rate(self) -> int:
        if self.config is None:
            return DEFAULT_SAMPLE_RATE
        return self.config.sample_rate()
