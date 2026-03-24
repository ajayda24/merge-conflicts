"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Sparkles,
  User,
  ArrowLeft,
  Loader2,
  MessageCircle,
  Stethoscope,
  AlertTriangle,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────
interface ThreadResult {
  id: string;
  title: string;
  category: string | null;
  created_at: string;
}

interface TriageMetadata {
  level: "normal" | "bad" | "severe";
  threads?: ThreadResult[];
  specialist?: string;
  topics?: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  triage?: TriageMetadata;
}

export default function ChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [manualMessages, setManualMessages] = useState<ChatMessage[]>([]);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSummarized = useRef(false);

  // useChat for NORMAL streaming responses
  const { messages: streamMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const isLoading = isStreaming || isManualLoading;

  // Combine stream messages and manual messages for unified display
  const allMessages: ChatMessage[] = [
    ...manualMessages,
    ...streamMessages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content:
        m.parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") ?? "",
    })),
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length, isLoading]);

  // ── Session-end summary ────────────────────────────────────
  const triggerSummary = useCallback(async (): Promise<boolean> => {
    if (hasSummarized.current || allMessages.length < 2) return false;
    hasSummarized.current = true;

    try {
      const payload = allMessages.map((m) => ({
        role: m.role,
        parts: [{ type: "text", text: m.content }],
      }));
      const res = await fetch("/api/chat/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [allMessages]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") triggerSummary();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [triggerSummary]);

  const handleBack = async () => {
    if (allMessages.length >= 2 && !hasSummarized.current) {
      setIsSaving(true);
      await triggerSummary();
      setIsSaving(false);
    }
    router.back();
  };

  // ── Custom send handler ────────────────────────────────────
  // Sends to the API, checks if response is streaming (normal)
  // or JSON (bad/severe), and handles accordingly.
  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    // Build the full message history for the API
    const allPrev = [...manualMessages, userMsg];
    const apiMessages = allPrev.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
    }));

    setManualMessages(allPrev);
    setIsManualLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // ── BAD or SEVERE: JSON response ──────────────────
        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.content || "I'm here for you.",
          triage: {
            level: data.level,
            threads: data.threads,
            specialist: data.specialist,
            topics: data.topics,
          },
        };

        setManualMessages((prev) => [...prev, assistantMsg]);
      } else {
        // ── NORMAL: Streaming response ────────────────────
        // Read the stream and accumulate text
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let fullText = "";
        const assistantId = `assistant-${Date.now()}`;

        // Add placeholder message
        setManualMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "" },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE data lines — extract text from the AI SDK protocol
          const lines = chunk.split("\n");
          for (const line of lines) {
            // AI SDK SSE format: lines starting with specific type codes
            // "0:" prefix = text delta
            if (line.startsWith("0:")) {
              try {
                const textContent = JSON.parse(line.slice(2));
                if (typeof textContent === "string") {
                  fullText += textContent;
                }
              } catch {
                // Not valid JSON, skip
              }
            }
          }

          // Update the message in place
          setManualMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m
            )
          );
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setManualMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "I'm sorry, I had trouble responding. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSend(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header with back button ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            disabled={isSaving}
            aria-label="Back"
            className="shrink-0"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowLeft className="h-5 w-5" />
            )}
          </Button>

          <div className="flex items-center gap-2 flex-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Matri</p>
              <p className="text-xs text-muted-foreground">
                {isSaving ? "Saving session…" : "AI Wellness Companion"}
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground px-2 py-1">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col">
        {allMessages.length === 0 ? (
          /* ── Empty state ──────────────────────────────────── */
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md p-8 text-center border-0 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-medium mb-2">
                Hi, I&apos;m Matri
              </h2>
              <p className="text-muted-foreground mb-6">
                I&apos;m here to listen, support, and help you navigate your
                wellness journey. What&apos;s on your mind today?
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "I'm feeling stressed",
                  "I need someone to talk to",
                  "Help me relax",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(suggestion)}
                    className="text-sm"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          /* ── Messages ─────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {allMessages.map((message) => (
              <div key={message.id}>
                {/* Message bubble */}
                <div
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* ── BAD: Related threads card ─────────────── */}
                {message.triage?.level === "bad" &&
                  message.triage.threads &&
                  message.triage.threads.length > 0 && (
                    <div className="mt-3 ml-11">
                      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              Others in the community have shared similar
                              experiences
                            </p>
                          </div>
                          <div className="space-y-2">
                            {message.triage.threads.map((thread) => (
                              <Link
                                key={thread.id}
                                href={`/community/${thread.id}`}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors group"
                              >
                                <MessageCircle className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="text-sm text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300 line-clamp-1">
                                  {thread.title}
                                </span>
                                {thread.category && (
                                  <Badge
                                    variant="outline"
                                    className="ml-auto text-xs shrink-0"
                                  >
                                    {thread.category}
                                  </Badge>
                                )}
                              </Link>
                            ))}
                          </div>
                          <Link
                            href="/community"
                            className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Browse all community discussions →
                          </Link>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                {/* ── BAD: No threads found fallback ────────── */}
                {message.triage?.level === "bad" &&
                  (!message.triage.threads ||
                    message.triage.threads.length === 0) && (
                    <div className="mt-3 ml-11">
                      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              You&apos;re not alone in this
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Connect with others who understand what you&apos;re
                            going through.
                          </p>
                          <Button asChild size="sm" variant="outline">
                            <Link href="/community">
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Visit Community
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                {/* ── SEVERE: Doctor redirect card ──────────── */}
                {message.triage?.level === "severe" &&
                  message.triage.specialist && (
                    <div className="mt-3 ml-11">
                      <Card className="border border-pink-300 dark:border-pink-800 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                            <p className="text-sm font-semibold text-pink-800 dark:text-pink-300">
                              Professional support recommended
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Based on what you&apos;ve shared, connecting with a{" "}
                            <strong className="text-foreground">
                              {message.triage.specialist}
                            </strong>{" "}
                            could really help. You deserve expert care and
                            support.
                          </p>
                          <Button asChild size="sm" className="w-full">
                            <Link
                              href={`/doctors?filter=${encodeURIComponent(message.triage.specialist)}`}
                            >
                              <Stethoscope className="h-4 w-4 mr-2" />
                              Find a {message.triage.specialist} near you
                            </Link>
                          </Button>
                          <p className="mt-3 text-xs text-muted-foreground">
                            Crisis helplines: iCall{" "}
                            <a
                              href="tel:9152987821"
                              className="underline text-foreground"
                            >
                              9152987821
                            </a>{" "}
                            · Vandrevala Foundation{" "}
                            <a
                              href="tel:18002662345"
                              className="underline text-foreground"
                            >
                              1860-2662-345
                            </a>
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
              </div>
            ))}

            {/* Loading indicator */}
            {isManualLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-secondary/50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ── Input form ──────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 bg-background pt-4"
        >
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[52px] max-h-32 resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-[52px] w-[52px] shrink-0"
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Matri is an AI companion and not a substitute for professional
            mental health care.
          </p>
        </form>
      </main>
    </div>
  );
}
