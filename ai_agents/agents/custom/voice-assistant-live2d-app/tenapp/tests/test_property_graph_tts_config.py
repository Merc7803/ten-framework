import json
import unittest
from pathlib import Path


PROPERTY_PATH = Path(__file__).resolve().parents[1] / "property.json"


class PropertyGraphTTSConfigTest(unittest.TestCase):
    def test_live2d_app_uses_senvoice_tts_addon_with_required_params(self):
        property_data = json.loads(PROPERTY_PATH.read_text(encoding="utf-8"))
        graph = property_data["ten"]["predefined_graphs"][0]["graph"]
        tts_node = next(node for node in graph["nodes"] if node["name"] == "tts")

        self.assertEqual(tts_node["addon"], "senvoice_tts_python")
        self.assertEqual(
            tts_node["property"]["params"]["key"],
            "${env:SENVOICE_TTS_KEY}",
        )
        self.assertEqual(
            tts_node["property"]["params"]["voice"],
            "${env:SENVOICE_TTS_VOICE|S_F03_ThuyDuyen}",
        )
        self.assertEqual(
            tts_node["property"]["params"]["sample_rate"],
            "${env:SENVOICE_TTS_SAMPLE_RATE|44100}",
        )


if __name__ == "__main__":
    unittest.main()
