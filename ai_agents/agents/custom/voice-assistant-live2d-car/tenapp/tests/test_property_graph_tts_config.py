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
        self.assertIn("ti\u1ebfng Vi\u1ec7t", llm_node["property"]["prompt"])
        self.assertIn("Xin ch\u00e0o", llm_node["property"]["greeting"])
        self.assertIn("Xin ch\u00e0o", main_control_node["property"]["greeting"])

    def test_live2d_car_prompt_requires_json_car_control_contract(self):
        llm_node = self._node("llm")
        prompt = llm_node["property"]["prompt"]

        self.assertIn('"reply"', prompt)
        self.assertIn('"commands"', prompt)
        self.assertIn("climate.ac", prompt)
        self.assertIn("locks.doors", prompt)

    def test_live2d_car_prompt_teaches_state_queries_and_fan_commands(self):
        llm_node = self._node("llm")
        prompt = llm_node["property"]["prompt"]

        self.assertIn("CURRENT_CAR_STATE", prompt)
        self.assertIn("t\u1ed1c \u0111\u1ed9 qu\u1ea1t", prompt)
        self.assertIn("t\u0103ng qu\u1ea1t l\u00ean m\u1ee9c 2", prompt)
        self.assertIn('"target":"climate.fan"', prompt)

    def test_live2d_car_prompt_keeps_general_assistant_capabilities_first(self):
        llm_node = self._node("llm")
        prompt = llm_node["property"]["prompt"]

        self.assertIn("general-purpose assistant", prompt)
        self.assertIn("car control is only one extra capability", prompt)
        self.assertIn("Do not present car controls as your only capabilities", prompt)
        self.assertIn("When asked what you can do", prompt)


if __name__ == "__main__":
    unittest.main()
