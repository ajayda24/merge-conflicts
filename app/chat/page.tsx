"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Sparkles, User, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSummarized = useRef(false);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Summary trigger ────────────────────────────────────────
  // Called explicitly (back button) or implicitly (tab hidden).
  // Returns true if summary was sent successfully.
  const saveSummary = useCallback(async (): Promise<boolean> => {
    if (hasSummarized.current || messages.length < 2) return false;
    hasSummarized.current = true;

    try {
      const res = await fetch("/api/chat/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [messages]);

  // Fallback: save silently if tab becomes hidden (no back button pressed)
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") saveSummary();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [saveSummary]);

  // ── Back button handler ────────────────────────────────────
  const handleBack = async () => {
    if (messages.length >= 2 && !hasSummarized.current) {
      setIsSaving(true);
      await saveSummary();
      setIsSaving(false);
    }
    router.back();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
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
      {/* ── Custom header with back button ─────────────────── */}
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

          {/* Nav links */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground px-2 py-1">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col">
        {messages.length === 0 ? (
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
                    onClick={() => sendMessage({ text: suggestion })}
                    className="text-sm"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
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
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <p
                          key={index}
                          className="whitespace-pre-wrap text-sm leading-relaxed"
                        >
                          {part.text}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role === "user" && (
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
