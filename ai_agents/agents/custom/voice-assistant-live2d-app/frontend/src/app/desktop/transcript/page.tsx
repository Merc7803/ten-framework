"use client";

import { useEffect, useState } from "react";
import TranscriptPanel from "@/components/TranscriptPanel";
import { connectDesktopTranscriptSources } from "@/lib/desktop-transcript";
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
  const [backendStatus, setBackendStatus] = useState("Waiting for backend");
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

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-950">
      <header className="flex shrink-0 items-center justify-between border-slate-200 border-b bg-white px-4 py-3">
        <div>
          <h1 className="font-semibold text-sm">Live Transcript</h1>
          <p className="text-slate-500 text-xs">
            Kevin the Marmot desktop assistant
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 text-xs">
          {connected ? (muted ? "Muted" : "Connected") : backendStatus}
        </span>
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
