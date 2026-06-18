import wave
from io import BytesIO
from typing import Any

from .constants import DEFAULT_CHUNK_SIZE, DEFAULT_SAMPLE_RATE


def build_senvoice_config(text: str, params: dict[str, Any]) -> dict[str, Any]:
    lang = params.get("lang") or params.get("language") or "vi"
    sample_rate = int(params.get("sample_rate", DEFAULT_SAMPLE_RATE))

    return {
        "text_input": {
            "text": str(text).strip(),
            "normalize": bool(params.get("normalize", True)),
            "norm_backend": params.get("norm_backend", "v2"),
            "preserve_case": bool(params.get("preserve_case", True)),
            "use_vinglish": bool(params.get("use_vinglish", True)),
            "norm_punc": bool(params.get("norm_punc", False)),
            "keep_punc": bool(params.get("keep_punc", False)),
            "lang": lang,
        },
        "audio_config": {
            "sample_rate": sample_rate,
        },
        "model_config": {
            "voice": params.get("voice", "S_F03_ThuyDuyen"),
            "speed": float(params.get("speed", 1)),
            "language": lang,
        },
    }


def extract_pcm_audio(
    audio: bytes, default_sample_rate: int = DEFAULT_SAMPLE_RATE
) -> tuple[bytes, int]:
    if not audio.startswith(b"RIFF"):
        return audio, default_sample_rate

    with wave.open(BytesIO(audio), "rb") as wav:
        sample_rate = wav.getframerate()
        pcm = wav.readframes(wav.getnframes())
    return pcm, sample_rate


def chunk_audio(audio: bytes, chunk_size: int = DEFAULT_CHUNK_SIZE):
    for offset in range(0, len(audio), chunk_size):
        yield audio[offset : offset + chunk_size]
