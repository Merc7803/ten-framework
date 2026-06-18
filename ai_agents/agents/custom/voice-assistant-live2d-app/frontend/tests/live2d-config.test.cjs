const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const propertyPath = path.resolve(__dirname, "../../tenapp/property.json");

function getLive2DGraph() {
  const property = JSON.parse(fs.readFileSync(propertyPath, "utf8"));
  return property.ten.predefined_graphs.find(
    (graph) => graph.name === "voice_assistant_live2d"
  ).graph;
}

test("Live2D graph exposes an HTTP control server for typed chat input", () => {
  const graph = getLive2DGraph();
  const node = graph.nodes.find(
    (item) => item.name === "http_server_python"
  );

  assert.ok(node, "expected http_server_python node to exist");
  assert.equal(node.addon, "http_server_python");
  assert.equal(node.property.listen_port, 8070);
});

test("Live2D graph routes HTTP control commands and data to main_control", () => {
  const graph = getLive2DGraph();
  const connection = graph.connections.find(
    (item) => item.extension === "http_server_python"
  );

  assert.ok(connection, "expected http_server_python connection to exist");
  assert.deepEqual(connection.cmd, [
    {
      names: ["http_cmd"],
      dest: [{ extension: "main_control" }],
    },
  ]);
  assert.deepEqual(connection.data, [
    {
      name: "http_data",
      dest: [{ extension: "main_control" }],
    },
  ]);
});
