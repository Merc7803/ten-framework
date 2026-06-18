import json
import unittest
from pathlib import Path


PROPERTY_PATH = Path(__file__).resolve().parents[1] / "property.json"


class PropertyGraphTTSConfigTest(unittest.TestCase):
    def _node(self, node_name):
        property_data = json.loads(PROPERTY_PATH.read_text(encoding="utf-8"))
        graph = property_data["ten"]["predefined_graphs"][0]["graph"]
        return next(node for node in graph["nodes"] if node["name"] == node_name)

    def test_live2d_app_uses_senvoice_tts_addon_with_required_params(self):
        tts_node = self._node("tts")

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

    def test_live2d_app_defaults_to_vietnamese_conversation(self):
        stt_node = self._node("stt")
        llm_node = self._node("llm")
        main_control_node = self._node("main_control")

        self.assertEqual(stt_node["property"]["params"]["language"], "vi")
        self.assertIn("Vietnamese", llm_node["property"]["prompt"])
        self.assertIn("tiếng Việt", llm_node["property"]["prompt"])
        self.assertIn("Xin chào", llm_node["property"]["greeting"])
        self.assertIn("Xin chào", main_control_node["property"]["greeting"])


if __name__ == "__main__":
    unittest.main()
