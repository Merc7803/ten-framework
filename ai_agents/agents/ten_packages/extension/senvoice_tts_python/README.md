# Senvoice TTS Python

HTTP text-to-speech extension for the Senvoice synchronous TTS API.

Required environment variables:

```env
SENVOICE_TTS_URL=https://senvoice-api.vizone.ai/tts-gateway-v2/v1/tts/sync/turbo
SENVOICE_TTS_KEY=
SENVOICE_TTS_VOICE=S_F03_ThuyDuyen
```

The extension receives `tts_text_input` and outputs mono 16-bit PCM audio frames through the standard TEN TTS interface.
