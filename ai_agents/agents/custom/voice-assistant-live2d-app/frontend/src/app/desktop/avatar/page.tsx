"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IRemoteAudioTrack } from "agora-rtc-sdk-ng";
import ClientOnlyLive2D from "@/components/ClientOnlyLive2D";
import { isPrimaryButtonDragging, shouldStartAvatarDrag } from "@/lib/avatar-pointer";
import { getKevinDesktopCharacter } from "@/lib/desktop-character";
import {
  buildDesktopAgentStartConfig,
  buildDesktopTokenRequest,
  parseDesktopAgoraCredentials,
} from "@/lib/desktop-session";
import {
  DEFAULT_LANGUAGE_MODE,
  getLanguageModeGreeting,
} from "@/lib/language-mode";
import { publishDesktopTranscriptMessage } from "@/lib/desktop-transcript";
import { resolveLive2DModelsBaseUrl } from "@/lib/live2d-assets";
import { apiPing, apiStartService, apiStopService } from "@/lib/request";
import type { AgoraConfig, TranscriptMessage } from "@/types";

const DESKTOP_CHANNEL = "desktop-channel";
const HTTP_CONTROL_PORT = 8070;
const DESKTOP_LANGUAGE_CHANNEL = "desktop-language-mode";

function publishDesktopSessionState(state: {
  connected: boolean;
  muted: boolean;
  backendStatus: string;
}) {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }
  const channel = new BroadcastChannel("desktop-session");
  channel.postMessage(state);
  channel.close();
}

async function checkBackendHealth() {
  const response = await fetch("/api/agents/list", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status}`);
  }
}

function genUUID(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function publishTranscriptToDesktop(message: TranscriptMessage) {
  publishDesktopTranscriptMessage(message);
  window.electronDesktop?.publishTranscriptMessage(message);
}

export default function DesktopAvatarPage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [languageMode, setLanguageMode] = useState(DEFAULT_LANGUAGE_MODE);
  const [isDragging, setIsDragging] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Waiting for backend");
  const [agoraService, setAgoraService] = useState<any>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] =
    useState<IRemoteAudioTrack | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const character = useMemo(
    () =>
      getKevinDesktopCharacter(
        resolveLive2DModelsBaseUrl(
          process.env.NEXT_PUBLIC_LIVE2D_REMOTE_MODELS_BASE_URL
        )
      ),
    []
  );

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.overflow = "hidden";
  }, []);

  useEffect(() => {
    window.electronDesktop?.setMenuState({ connected, muted });
    publishDesktopSessionState({ connected, muted, backendStatus });
  }, [backendStatus, connected, muted]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(DESKTOP_LANGUAGE_CHANNEL);
    channel.onmessage = (event) => {
      if (typeof event.data?.mode === "string") {
        setLanguageMode(event.data.mode);
      }
    };

    return () => channel.close();
  }, []);

  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const startPing = useCallback(
    (channel: string) => {
      stopPing();
      pingIntervalRef.current = setInterval(() => {
        void apiPing(channel).catch((error) => {
          console.error("Failed to ping desktop agent:", error);
        });
      }, 3000);
    },
    [stopPing]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let disposed = false;
    let unsubscribeTranscript: (() => void) | undefined;
    import("@/services/agora").then((module) => {
      if (disposed) {
        return;
      }
      const service = module.agoraService;
      setAgoraService(service);
      service.setOnRemoteAudioTrack((track: IRemoteAudioTrack | null) => {
        setRemoteAudioTrack(track);
      });
      unsubscribeTranscript = service.addTranscriptListener(
        publishTranscriptToDesktop
      );
    });

    return () => {
      disposed = true;
      unsubscribeTranscript?.();
      stopPing();
    };
  }, [stopPing]);

  const disconnectDesktopSession = useCallback(async () => {
    setConnecting(true);
    stopPing();
    try {
      await apiStopService(DESKTOP_CHANNEL).catch((error) => {
        console.warn("Failed to stop desktop agent:", error);
      });
      await agoraService?.disconnect();
      setConnected(false);
      setRemoteAudioTrack(null);
      setBackendStatus("Disconnected");
    } finally {
      setConnecting(false);
    }
  }, [agoraService, stopPing]);

  const connectDesktopSession = useCallback(async () => {
    if (!agoraService || connecting) {
      return;
    }

    setConnecting(true);
    setBackendStatus("Connecting...");

    try {
      await checkBackendHealth();
      await apiStopService(DESKTOP_CHANNEL).catch(() => undefined);

      const uid = Math.floor(Math.random() * 100000);
      const tokenResponse = await fetch("/api/token/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildDesktopTokenRequest({
            requestId: genUUID(),
            uid,
            channel: DESKTOP_CHANNEL,
          })
        ),
      });

      if (!tokenResponse.ok) {
        throw new Error(
          `Failed to get desktop Agora credentials: ${tokenResponse.statusText}`
        );
      }

      const agoraConfig = parseDesktopAgoraCredentials(
        await tokenResponse.json()
      ) as AgoraConfig;
      const connectedToRtc = await agoraService.connect(agoraConfig);
      if (!connectedToRtc) {
        throw new Error("Failed to connect desktop avatar to Agora");
      }

      await apiStartService(
        buildDesktopAgentStartConfig({
          channel: agoraConfig.channel,
          userId: agoraConfig.uid || uid,
          greeting: getLanguageModeGreeting(
            languageMode,
            character.name,
            character.agentGreeting
          ),
          httpPort: HTTP_CONTROL_PORT,
          languageMode,
        })
      );

      setMuted(agoraService.isMicrophoneMuted());
      setConnected(true);
      setBackendStatus(`Connected to ${DESKTOP_CHANNEL}`);
      startPing(agoraConfig.channel);
    } catch (error) {
      console.error("Desktop connect failed:", error);
      setConnected(false);
      setBackendStatus("Backend not running");
      window.electronDesktop?.showBackendHelp();
    } finally {
      setConnecting(false);
    }
  }, [
    agoraService,
    character.agentGreeting,
    character.name,
    connecting,
    languageMode,
    startPing,
  ]);

  useEffect(() => {
    const unsubscribe = window.electronDesktop?.onMenuAction(async (action) => {
      if (action === "toggle-microphone") {
        if (!agoraService) {
          return;
        }
        if (muted) {
          agoraService.unmuteMicrophone();
          setMuted(false);
        } else {
          agoraService.muteMicrophone();
          setMuted(true);
        }
        return;
      }

      if (action === "toggle-connection") {
        if (connected) {
          await disconnectDesktopSession();
          return;
        }

        await connectDesktopSession();
      }
    });

    return () => unsubscribe?.();
  }, [
    agoraService,
    connectDesktopSession,
    connected,
    disconnectDesktopSession,
    muted,
  ]);

  const handleContextMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    window.electronDesktop?.showAvatarMenu();
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!shouldStartAvatarDrag(event.button)) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    window.electronDesktop?.startAvatarDrag();
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!isDragging || (event.buttons & 1) !== 1) {
        return;
      }
      if (!isPrimaryButtonDragging(event.buttons)) {
        return;
      }
      window.electronDesktop?.moveAvatarDrag();
    },
    [isDragging]
  );

  const handlePointerEnd = useCallback(() => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    window.electronDesktop?.endAvatarDrag();
  }, [isDragging]);

  return (
    <main
      className="h-screen w-screen select-none overflow-hidden bg-transparent"
      onContextMenuCapture={handleContextMenu}
      onPointerCancelCapture={handlePointerEnd}
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerEnd}
      style={{ cursor: isDragging ? "grabbing" : "grab" } as CSSProperties}
    >
      <div className="relative h-full w-full">
        <ClientOnlyLive2D
          modelPath={character.path}
          mouthConfig={character.mouthConfig}
          expressions={character.expressions}
          motions={character.motions}
          audioTrack={remoteAudioTrack}
          className="h-full w-full bg-transparent drop-shadow-[0_18px_42px_rgba(40,110,62,0.38)]"
        />
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-white/80 px-3 py-1 font-medium text-[#264932] text-xs shadow-sm backdrop-blur">
          {connecting
            ? "Connecting..."
            : connected
              ? muted
                ? "Muted"
                : "Listening"
              : backendStatus}
        </div>
      </div>
    </main>
  );
}
