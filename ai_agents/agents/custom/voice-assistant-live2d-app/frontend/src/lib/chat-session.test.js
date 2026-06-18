const assert = require("node:assert/strict");
const test = require("node:test");

const { sendTextMessage } = require("./chat-session");

test("sendTextMessage posts text through the agent server text endpoint", async () => {
  const calls = [];
  const post = async (url, body) => {
    calls.push({ url, body });
    return { data: { ok: true } };
  };

  const response = await sendTextMessage({
    post,
    requestId: "request-1",
    channel: "test-channel",
    httpPort: 8070,
    text: " hello avatar ",
  });

  assert.deepEqual(response, { ok: true });
  assert.deepEqual(calls, [
    {
      url: "/api/agents/text",
      body: {
        request_id: "request-1",
        channel_name: "test-channel",
        text: "hello avatar",
      },
    },
  ]);
});
