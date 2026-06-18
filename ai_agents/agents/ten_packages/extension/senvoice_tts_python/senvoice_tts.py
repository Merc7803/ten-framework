import json
from typing import Any, AsyncIterator

from httpx import AsyncClient, Limits, Timeout  # type: ignore

from ten_ai_base.const import LOG_CATEGORY_VENDOR  # type: ignore
from ten_ai_base.struct import TTS2HttpResponseEventType  # type: ignore
from ten_ai_base.tts2_http import AsyncTTS2HttpClient  # type: ignore
from ten_runtime import AsyncTenEnv  # type: ignore

from .audio_utils import build_senvoice_config, chunk_audio, extract_pcm_audio
from .config import SenvoiceTTSConfig
from .constants import DEFAULT_CHUNK_SIZE, DEFAULT_ENDPOINT


class SenvoiceTTSClient(AsyncTTS2HttpClient):
    def __init__(
        self,
        config: SenvoiceTTSConfig,
        ten_env: AsyncTenEnv,
    ):
        super().__init__()
        self.config = config
        self.ten_env = ten_env
        self._is_cancelled = False
        self.endpoint = config.params.get("base_url") or config.params.get(
            "endpoint", DEFAULT_ENDPOINT
        )
        self.api_key = config.params.get("key", "")
        self.client = AsyncClient(
            timeout=Timeout(timeout=float(config.params.get("timeout", 120))),
            limits=Limits(
                max_connections=20,
                max_keepalive_connections=10,
                keepalive_expiry=120.0,
            ),
        )

    async def cancel(self):
        self.ten_env.log_debug("SenvoiceTTS: cancel() called.")
        self._is_cancelled = True

    async def get(
        self, text: str, request_id: str
    ) -> AsyncIterator[tuple[bytes | None, TTS2HttpResponseEventType]]:
        self._is_cancelled = False
        text = str(text or "").strip()
        if not text:
            yield None, TTS2HttpResponseEventType.END
            return

        payload = build_senvoice_config(text, self.config.params)
        headers = {"X-API-Key": self.api_key}

        try:
            response = await self.client.post(
                self.endpoint,
                headers=headers,
                files={
                    "config": (
                        None,
                        json.dumps(payload, ensure_ascii=False),
                        "application/json",
                    )
                },
            )
            response.raise_for_status()

            pcm, detected_sample_rate = extract_pcm_audio(
                response.content, self.config.sample_rate()
            )
            if detected_sample_rate != self.config.sample_rate():
                self.ten_env.log_warn(
                    "SenvoiceTTS: response sample_rate "
                    f"{detected_sample_rate} differs from configured "
                    f"{self.config.sample_rate()}."
                )

            for chunk in chunk_audio(
                pcm, int(self.config.params.get("chunk_size", DEFAULT_CHUNK_SIZE))
            ):
                if self._is_cancelled:
                    yield None, TTS2HttpResponseEventType.FLUSH
                    return
                if chunk:
                    yield bytes(chunk), TTS2HttpResponseEventType.RESPONSE

            yield None, TTS2HttpResponseEventType.END
        except Exception as e:
            error_message = str(e)
            self.ten_env.log_error(
                f"SenvoiceTTS vendor_error: {error_message} "
                f"of request_id: {request_id}.",
                category=LOG_CATEGORY_VENDOR,
            )
            if "401" in error_message or "403" in error_message:
                yield (
                    error_message.encode("utf-8"),
                    TTS2HttpResponseEventType.INVALID_KEY_ERROR,
                )
            else:
                yield error_message.encode("utf-8"), TTS2HttpResponseEventType.ERROR

    async def clean(self):
        self.ten_env.log_debug("SenvoiceTTS: clean() called.")
        await self.client.aclose()

    def get_extra_metadata(self) -> dict[str, Any]:
        return {
            "voice": self.config.params.get("voice", ""),
            "language": self.config.params.get("lang", ""),
        }
