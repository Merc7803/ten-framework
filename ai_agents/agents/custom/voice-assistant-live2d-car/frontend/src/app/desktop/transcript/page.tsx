"use client";

import { useEffect, useState } from "react";
import CarDashboard from "@/components/CarDashboard";
import TranscriptPanel from "@/components/TranscriptPanel";
import { connectDesktopTranscriptSources } from "@/lib/desktop-transcript";
import {
  applyCarCommands,
  createDefaultCarState,
} from "@/lib/car-dashboard";
import { DEFAULT_LANGUAGE_MODE, LANGUAGE_MODE_OPTIONS } from "@/lib/language-mode";
import type { TranscriptMessage } from "@/types";

const DESKTOP_CHANNEL = "desktop-channel";
const HTTP_CONTROL_PORT = 8070;

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
  const [languageMode, setLanguageMode] = useState(DEFAULT_LANGUAGE_MODE);
  const [backendStatus, setBackendStatus] = useState("Waiting for backend");
  const [assistantState, setAssistantState] = useState<"awake" | "sleeping">(
    "sleeping"
  );
  const [carState, setCarState] = useState(createDefaultCarState());
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
      if (event.data?.languageMode) {
        setLanguageMode(event.data.languageMode);
      }
      setBackendStatus(event.data?.backendStatus || "Waiting for backend");
      setAssistantState(event.data?.connected ? "awake" : "sleeping");
    };

    return () => channel.close();
  }, []);

  useEffect(() => {
    const appendMessage = (message: TranscriptMessage) => {
      if (message.dataType === "car_command") {
        setCarState((prev) => applyCarCommands(prev, message.commands));
        return;
      }
      if (message.sessionState === "sleeping") {
        setAssistantState("sleeping");
        return;
      }
      if (message.sessionState === "awake") {
        setAssistantState("awake");
        return;
      }
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

  const handleLanguageModeChange = (mode: string) => {
    setLanguageMode(mode);
    if (typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel("desktop-language-mode");
    channel.postMessage({ languageMode: mode });
    channel.close();
  };

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-950">
      <header className="flex shrink-0 items-center justify-between border-slate-200 border-b bg-white px-4 py-3">
        <div>
          <h1 className="font-semibold text-sm">Marmot Car Assistant</h1>
          <p className="text-slate-500 text-xs">
            Kevin the Marmot voice cockpit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
            {LANGUAGE_MODE_OPTIONS.map((option) => {
              const isActive = option.id === languageMode;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    "rounded px-2.5 py-1 font-medium text-xs transition",
                    isActive
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                  disabled={connected}
                  onClick={() => handleLanguageModeChange(option.id)}
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

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] gap-3 overflow-hidden p-3">
        <CarDashboard state={carState} assistantState={assistantState} />
        <TranscriptPanel
          channel={DESKTOP_CHANNEL}
          externalMessages={transcriptMessages}
          httpPort={HTTP_CONTROL_PORT}
          isConnected={connected}
          className="min-h-0 rounded-md border border-slate-200 shadow-none"
        />
      </div>
    </main>
  );
}
