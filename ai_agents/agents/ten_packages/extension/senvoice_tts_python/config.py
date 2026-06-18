import copy
from pathlib import Path
from typing import Any

from pydantic import Field  # type: ignore
from ten_ai_base import utils  # type: ignore
from ten_ai_base.tts2_http import AsyncTTS2HttpConfig  # type: ignore

from .constants import DEFAULT_ENDPOINT, DEFAULT_SAMPLE_RATE


class SenvoiceTTSConfig(AsyncTTS2HttpConfig):
    dump: bool = Field(default=False, description="Senvoice TTS dump")
    dump_path: str = Field(
        default_factory=lambda: str(Path(__file__).parent / "senvoice_tts_in.pcm"),
        description="Senvoice TTS dump path",
    )
    params: dict[str, Any] = Field(
        default_factory=dict, description="Senvoice TTS params"
    )

    def update_params(self) -> None:
        self.params.setdefault("base_url", DEFAULT_ENDPOINT)
        self.params.setdefault("voice", "S_F03_ThuyDuyen")
        self.params.setdefault("speed", 1)
        self.params.setdefault("lang", "vi")
        self.params.setdefault("sample_rate", DEFAULT_SAMPLE_RATE)
        self.params.setdefault("normalize", True)
        self.params.setdefault("norm_backend", "v2")
        self.params.setdefault("preserve_case", True)
        self.params.setdefault("use_vinglish", True)
        self.params.setdefault("norm_punc", False)
        self.params.setdefault("keep_punc", False)

    def sample_rate(self) -> int:
        return int(self.params.get("sample_rate", DEFAULT_SAMPLE_RATE))

    def to_str(self, sensitive_handling: bool = True) -> str:
        if not sensitive_handling:
            return f"{self}"

        config = copy.deepcopy(self)
        if config.params and "key" in config.params:
            config.params["key"] = utils.encrypt(config.params["key"])
        return f"{config}"

    def validate(self) -> None:
        if not self.params.get("key"):
            raise ValueError("SENVOICE_TTS_KEY is required for Senvoice TTS")
