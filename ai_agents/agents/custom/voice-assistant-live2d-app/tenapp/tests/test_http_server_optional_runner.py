import unittest

from ten_packages.extension.http_server_python.http_server_extension import (
    HTTPServerExtension,
)


class HTTPServerOptionalRunnerTest(unittest.IsolatedAsyncioTestCase):
    async def test_on_stop_is_safe_when_runner_was_never_started(self):
        extension = HTTPServerExtension("http_server_python")

        await extension.on_stop(None)

        self.assertIsNone(extension.ten_env)


if __name__ == "__main__":
    unittest.main()
