"use client";

import { useEffect, useState } from "react";
import TranscriptPanel from "@/components/TranscriptPanel";
import { connectDesktopTranscriptSources } from "@/lib/desktop-transcript";
import {
  DEFAULT_LANGUAGE_MODE,
  LANGUAGE_MODE_OPTIONS,
} from "@/lib/language-mode";
import type { TranscriptMessage } from "@/types";

const DESKTOP_CHANNEL = "desktop-channel";
const HTTP_CONTROL_PORT = 8070;
const DESKTOP_LANGUAGE_CHANNEL = "desktop-language-mode";

function normalizeTranscriptMessage(
  message: TranscriptMessage
): TranscriptMessage {
  return {
    ...message,
    timestamp:
      message.timestamp instanceof Date
        ? message.timestamp
        : new Date(message.timestamp),
    isFinal: message.isFinal ?? true,
  };
}

export default function DesktopTranscriptPage() {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Waiting for backend");
  const [languageMode, setLanguageMode] = useState(DEFAULT_LANGUAGE_MODE);
  const [transcriptMessages, setTranscriptMessages] = useState<
    TranscriptMessage[]
  >([]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel("desktop-session");
    channel.onmessage = (event) => {
      setConnected(Boolean(event.data?.connected));
      setMuted(Boolean(event.data?.muted));
      setBackendStatus(event.data?.backendStatus || "Waiting for backend");
    };

    return () => channel.close();
  }, []);

  useEffect(() => {
    const appendMessage = (message: TranscriptMessage) => {
      setTranscriptMessages((prev) => [
        ...prev,
        normalizeTranscriptMessage(message),
      ]);
    };

    return connectDesktopTranscriptSources({
      onMessage: appendMessage,
      subscribeIpc: window.electronDesktop?.onTranscriptMessage,
      notifyReady: window.electronDesktop?.notifyTranscriptReady,
    });
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(DESKTOP_LANGUAGE_CHANNEL);
    channel.postMessage({ mode: languageMode });
    return () => channel.close();
  }, [languageMode]);

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-slate-200 border-b bg-white px-4 py-3">
        <div>
          <h1 className="font-semibold text-sm">Live Transcript</h1>
          <p className="text-slate-500 text-xs">
            Kevin the Marmot desktop assistant
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex rounded-full bg-slate-100 p-1">
            {LANGUAGE_MODE_OPTIONS.map((option) => {
              const isActive = option.id === languageMode;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLanguageMode(option.id)}
                  disabled={connected}
                  className={`rounded-full px-2.5 py-1 font-semibold text-xs transition ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:bg-white"
                  } ${connected ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 text-xs">
            {connected ? (muted ? "Muted" : "Connected") : backendStatus}
          </span>
        </div>
      </header>

      <TranscriptPanel
        channel={DESKTOP_CHANNEL}
        externalMessages={transcriptMessages}
        httpPort={HTTP_CONTROL_PORT}
        isConnected={connected}
        className="min-h-0 flex-1 rounded-none border-0 shadow-none"
      />
    </main>
  );
}
