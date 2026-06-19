"use client";

import {
  Bot,
  Clock,
  Download,
  MessageSquare,
  Send,
  Trash2,
  User,
} from "lucide-react";
import axios from "axios";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createUserChatMessage,
  isChatSubmittable,
  mergeTranscriptMessage,
  sendTextMessage,
} from "@/lib/chat-session";
// agoraService will be imported dynamically
import type { TranscriptMessage } from "@/types";

interface TranscriptPanelProps {
  channel: string;
  className?: string;
  httpPort?: number;
  externalMessages?: TranscriptMessage[];
  isConnected: boolean;
}

function genUUID(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export default function TranscriptPanel({
  channel,
  className,
  externalMessages = [],
  httpPort = 8070,
  isConnected,
}: TranscriptPanelProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatError, setChatError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [agoraService, setAgoraService] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import Agora service only on client side
    if (typeof window !== "undefined") {
      import("@/services/agora").then((module) => {
        setAgoraService(module.agoraService);
      });
    }
  }, []);

  useEffect(() => {
    if (!agoraService) return;

    // Set up transcript message listener
    const unsubscribe = agoraService.addTranscriptListener(
      (message: TranscriptMessage) => {
        if (!isEnabled) {
          return;
        }
        setMessages((prev) => mergeTranscriptMessage(prev, message));
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [agoraService, isEnabled]);

  useEffect(() => {
    if (!isEnabled || externalMessages.length === 0) {
      return;
    }

    setMessages((prev) =>
      externalMessages.reduce(
        (next, message) => mergeTranscriptMessage(next, message),
        prev
      )
    );
  }, [externalMessages, isEnabled]);

  useEffect(() => {
    if (isAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isAutoScroll]);

  const clearMessages = () => {
    setMessages([]);
  };

  const handleChatSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isChatSubmittable(chatText, isConnected) || isSending) {
      return;
    }

    setChatError("");
    setIsSending(true);

    const requestId = genUUID();
    const userMessage = createUserChatMessage({
      id: `chat-${requestId}`,
      text: chatText,
    });
    const textToSend = userMessage.text;
    setMessages((prev) => mergeTranscriptMessage(prev, userMessage));
    setChatText("");

    try {
      await sendTextMessage({
        post: axios.post,
        requestId,
        channel,
        httpPort,
        text: textToSend,
      });
    } catch (error) {
      console.error("Failed to send chat message:", error);
      setChatError("Message failed to send");
    } finally {
      setIsSending(false);
    }
  };

  const exportTranscript = () => {
    const transcript = messages
      .map(
        (msg) =>
          `[${msg.timestamp.toLocaleTimeString()}] ${msg.isUser ? "User" : "Assistant"}: ${msg.text}`
      )
      .join("\n");

    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "";
    if (confidence > 0.8) return "text-green-600";
    if (confidence > 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card
      className={["flex h-full min-h-0 flex-col overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
    >
      <CardHeader className="shrink-0 p-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Live Transcript
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time conversation transcript
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <Label htmlFor="transcript-enabled" className="text-xs">
              Enable
            </Label>
            <Switch
              id="transcript-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 p-3 pt-0">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="auto-scroll" className="text-xs">
              Auto-scroll
            </Label>
            <Switch
              id="auto-scroll"
              checked={isAutoScroll}
              onCheckedChange={setIsAutoScroll}
            />
          </div>

          <div className="flex gap-1.5">
            <Button
              onClick={exportTranscript}
              variant="outline"
              size="sm"
              disabled={messages.length === 0}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Export
            </Button>

            <Button
              onClick={clearMessages}
              variant="outline"
              size="sm"
              disabled={messages.length === 0}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-2 h-6 w-6 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">
                  Start a conversation to see the transcript
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 rounded-md p-2.5 ${
                  message.isUser
                    ? "border-primary border-l-4 bg-primary/10"
                    : "border-secondary border-l-4 bg-secondary/50"
                }`}
              >
                <div className="flex-shrink-0">
                  {message.isUser ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : (
                    <Bot className="h-4 w-4 text-secondary-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="font-medium text-xs">
                      {message.isUser ? "You" : "Assistant"}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(message.timestamp)}
                    </div>
                    {message.confidence && (
                      <span
                        className={`text-xs ${getConfidenceColor(message.confidence)}`}
                      >
                        ({Math.round(message.confidence * 100)}%)
                      </span>
                    )}
                  </div>

                  <p className="break-words text-xs leading-relaxed">
                    {message.text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Stats */}
        {messages.length > 0 && (
          <div className="text-center text-muted-foreground text-xs">
            {messages.length} message{messages.length !== 1 ? "s" : ""} •
            {messages.filter((m) => m.isUser).length} from you •
            {messages.filter((m) => !m.isUser).length} from assistant
          </div>
        )}

        <form className="shrink-0 space-y-2" onSubmit={handleChatSubmit}>
          <textarea
            value={chatText}
            onChange={(event) => setChatText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={!isConnected || isSending}
            rows={2}
            className="min-h-16 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={
              isConnected
                ? "Type a message to the avatar"
                : "Connect to start chatting"
            }
          />
          <div className="flex items-center justify-between gap-2">
            <p className="min-h-4 text-red-600 text-xs">{chatError}</p>
            <Button
              type="submit"
              size="sm"
              disabled={!isChatSubmittable(chatText, isConnected) || isSending}
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
