import json
import unittest
from pathlib import Path


TENAPP_DIR = Path(__file__).resolve().parents[1]


class PropertyGraphTimeToolTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (TENAPP_DIR / "property.json").open(encoding="utf-8") as f:
            cls.property_json = json.load(f)
        with (TENAPP_DIR / "manifest.json").open(encoding="utf-8") as f:
            cls.manifest_json = json.load(f)

    def _graph(self):
        return self.property_json["ten"]["predefined_graphs"][0]["graph"]

    def _node(self, name):
        for node in self._graph()["nodes"]:
            if node.get("name") == name:
                return node
        self.fail(f"node {name!r} not found")

    def _main_control_connection(self):
        for connection in self._graph()["connections"]:
            if connection.get("extension") == "main_control":
                return connection
        self.fail("main_control connection not found")

    def test_graph_registers_local_time_tool_with_main_control(self):
        node = self._node("local_time_tool_python")

        self.assertEqual(node["addon"], "local_time_tool_python")
        self.assertEqual(node["property"]["timezone"], "Asia/Ho_Chi_Minh")
        self.assertEqual(node["property"]["locale"], "vi-VN")

        tool_register_sources = [
            source["extension"]
            for cmd in self._main_control_connection()["cmd"]
            if "tool_register" in cmd["names"]
            for source in cmd["source"]
        ]
        self.assertIn("local_time_tool_python", tool_register_sources)

    def test_manifest_depends_on_local_time_tool_package(self):
        paths = {
            dep.get("path")
            for dep in self.manifest_json["dependencies"]
            if "path" in dep
        }

        self.assertIn(
            "../../../ten_packages/extension/local_time_tool_python",
            paths,
        )


if __name__ == "__main__":
    unittest.main()
