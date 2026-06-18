# Live2D Desktop App Plan

## Goal

Build a Windows-first desktop version of the Live2D voice assistant. The avatar should live outside the browser as an always-on-top desktop overlay while still reusing the existing TEN backend, Agora audio flow, Live2D renderer, transcript panel, and typed chat flow.

## Phase 1 Scope

- Create a separate copy of the existing custom Live2D assistant at `ai_agents/agents/custom/voice-assistant-live2d-app`.
- Keep `ai_agents/agents/custom/voice-assistant-live2d` intact as the fallback web version.
- Use Electron for the desktop shell.
- Run as a development app first. Building an `.exe` or installer is deferred.
- Connect to the existing local backend/API/TEN runtime. The desktop app does not start backend services in phase 1.
- Use Kevin the Marmot as the default Live2D character.
- Keep provider API keys out of the desktop app. OpenAI, Deepgram, ElevenLabs, and other provider secrets remain in backend/TEN environment files.
- Use the frontend `.env.local` style configuration for client-side local settings such as Agora App ID and API base URL.

## Non-Goals For Phase 1

- No camera support.
- No tray icon.
- No click-through mode.
- No installer or polished `.exe` packaging.
- No automatic backend startup.
- No character picker.
- No transcript window position persistence.
- No cross-platform polish beyond Windows.

## Desktop Windows

### Avatar Window

- Transparent and frameless.
- Always on top by default.
- Renders only the Live2D avatar overlay UI.
- First launch position: bottom-right of the primary display.
- Default size target: about `300x420`.
- Left mouse drag moves the whole avatar window.
- App stores avatar position and restores it on the next launch.
- Dragging may move the avatar partially outside the screen, but a visible part of the avatar must remain reachable.
- Right click opens the avatar context menu.

### Transcript Window

- Separate normal-looking window with an opaque readable background.
- Opened and hidden from the avatar context menu.
- Placed next to the avatar when opened.
- Uses the existing transcript and typed chat experience.
- Phase 1 does not persist transcript window size or position.

## Avatar Context Menu

Minimum phase 1 menu:

- `Open Live Transcript` / `Hide Live Transcript`
- `Connect` / `Disconnect`
- `Mute` / `Unmute microphone`
- `Always on top: On` / `Off`
- `Quit`

## Backend Availability Behavior

- The avatar can open even if backend services are not running.
- If the user chooses `Connect` while backend is unavailable, the app should:
  - show a `Backend not running` status in the transcript/menu state, and
  - show a popup with guidance to run the local development services.

Suggested guidance:

```powershell
cd ai_agents/agents/custom/voice-assistant-live2d-app
task run
```

## Proposed Code Organization

```text
frontend/
  electron/
    main.ts
    preload.ts
    window-state.ts
  src/
    app/
      desktop/
        avatar/page.tsx
        transcript/page.tsx
```

Expected reuse from the current frontend:

- `src/components/Live2DCharacter.tsx`
- `src/components/TranscriptPanel.tsx`
- `src/lib/chat-session.js`
- `src/lib/live2d-loader.ts`
- `src/lib/pixi-setup.ts`
- existing API/request helpers

## Data Flow

Phase 1 keeps the existing local-service model:

```text
TEN backend/API running locally
        |
        v
Electron renderer windows
        |
        +-- Avatar window: Live2D, mic/session state, context menu triggers
        |
        +-- Transcript window: transcript display and typed chat
```

Typed chat should continue to use the HTTP control path already added for the web version.

Voice chat should continue to use the existing Agora/STT/LLM/TTS graph.

## Reliability And UX Requirements

- App should not crash when backend is unavailable.
- Avatar position should remain recoverable if the display layout changes.
- Always-on-top should be toggleable from the context menu.
- Quit should close all Electron windows cleanly.
- The old web version must remain runnable from `voice-assistant-live2d`.

## Security Notes

- Do not embed provider API keys in Electron main, preload, or renderer code.
- Avoid logging Agora tokens or generated credentials.
- Keep Electron preload narrow. Expose only explicit desktop actions needed by the renderer.
- Keep Node integration disabled in renderer windows unless a specific need is proven.
- Keep context isolation enabled.
- Restrict any local proxy/control endpoints to the ports and paths required by the TEN graph.

## Testing Strategy

Automated checks:

- Keep existing frontend chat/session unit tests passing.
- Keep existing TEN main control tests passing.
- Add unit tests for avatar window-state clamping if implemented as a pure helper.

Manual Windows validation:

- Avatar opens as transparent always-on-top overlay.
- Avatar renders Kevin the Marmot.
- Left mouse drag moves avatar.
- Dragging cannot lose the avatar completely off-screen.
- Right click opens the context menu.
- Transcript window opens and hides from the menu.
- Connect/disconnect works when backend is running.
- Backend missing state is shown when backend is not running.
- Typed chat still reaches the assistant.
- Voice interaction still works through the existing pipeline.

## Decision Log

- Target Windows first.
- Build a separate desktop app copy instead of modifying the existing web copy in place.
- Use Electron for phase 1.
- Phase 1 connects to an already-running local backend.
- Use separate avatar and transcript windows.
- Drag the avatar window by holding left mouse on the avatar.
- Do not support click-through in phase 1.
- Use the minimum context menu listed above.
- Do not support camera in phase 1.
- Remember avatar position, defaulting to bottom-right on first launch.
- Do not remember transcript window position in phase 1.
- Keep provider secrets in backend/TEN environment files.
- Use `.env.local`-style frontend config for client settings.
- Use a minimal desktop overlay UI instead of the full web dashboard.
- Control microphone from the context menu only in phase 1.
- Show both status and popup guidance when backend is not running.
- Defer tray icon to phase 2.
- Clamp avatar position softly so it remains reachable.
- Defer `.exe` packaging.
- Use Kevin the Marmot as the default character.
