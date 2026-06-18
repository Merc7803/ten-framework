# pyright: reportMissingImports=false, reportMissingTypeStubs=false
import struct
import sys
from pathlib import Path


extension_dir = Path(__file__).resolve().parents[1]
extension_parent = extension_dir.parent
agents_dir = extension_dir.parents[2]
ten_runtime_interface = (
    agents_dir
    / "custom"
    / "voice-assistant-live2d-app"
    / "tenapp"
    / "ten_packages"
    / "system"
    / "ten_runtime_python"
    / "interface"
)
if str(extension_parent) not in sys.path:
    sys.path.insert(0, str(extension_parent))
if ten_runtime_interface.exists() and str(ten_runtime_interface) not in sys.path:
    sys.path.insert(0, str(ten_runtime_interface))

from senvoice_tts_python.audio_utils import (
    build_senvoice_config,
    chunk_audio,
    extract_pcm_audio,
)


def make_wav(sample_rate: int, pcm: bytes) -> bytes:
    byte_rate = sample_rate * 2
    block_align = 2
    bits_per_sample = 16
    data_size = len(pcm)
    riff_size = 36 + data_size
    return (
        b"RIFF"
        + struct.pack("<I", riff_size)
        + b"WAVEfmt "
        + struct.pack(
            "<IHHIIHH",
            16,
            1,
            1,
            sample_rate,
            byte_rate,
            block_align,
            bits_per_sample,
        )
        + b"data"
        + struct.pack("<I", data_size)
        + pcm
    )


def test_build_senvoice_config_maps_params_to_api_payload():
    payload = build_senvoice_config(
        " Xin chao ",
        {
            "voice": "S_F03_ThuyDuyen",
            "speed": 1.2,
            "lang": "vi",
            "sample_rate": 16000,
            "normalize": True,
            "norm_backend": "v2",
            "preserve_case": True,
            "use_vinglish": True,
            "norm_punc": False,
            "keep_punc": False,
        },
    )

    assert payload["text_input"]["text"] == "Xin chao"
    assert payload["text_input"]["lang"] == "vi"
    assert payload["audio_config"]["sample_rate"] == 16000
    assert payload["model_config"] == {
        "voice": "S_F03_ThuyDuyen",
        "speed": 1.2,
        "language": "vi",
    }


def test_build_senvoice_config_defaults_to_api_sample_rate():
    payload = build_senvoice_config("Xin chao", {})

    assert payload["audio_config"]["sample_rate"] == 44100


def test_extract_pcm_audio_strips_wav_header():
    pcm = b"\x01\x02\x03\x04"
    wav = make_wav(16000, pcm)

    audio, sample_rate = extract_pcm_audio(wav)

    assert audio == pcm
    assert sample_rate == 16000


def test_extract_pcm_audio_keeps_raw_pcm_when_not_wav():
    raw = b"\x01\x02\x03\x04"

    audio, sample_rate = extract_pcm_audio(raw, default_sample_rate=16000)

    assert audio == raw
    assert sample_rate == 16000


def test_chunk_audio_splits_bytes_into_stable_chunks():
    assert list(chunk_audio(b"abcdef", chunk_size=2)) == [b"ab", b"cd", b"ef"]


def test_package_import_registers_addon_module():
    import senvoice_tts_python

    assert hasattr(senvoice_tts_python, "addon")
