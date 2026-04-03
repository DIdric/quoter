"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hoi! Ik ben de Quoter-assistent. Heb je een vraag over de app? Stel hem gerust — ik help je snel verder.",
};

export function HelpdeskChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Add streaming assistant placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Netwerk fout");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(part.slice(6));
            if (event.text) {
              assembled += event.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assembled,
                  streaming: true,
                };
                return updated;
              });
            }
            if (event.done || event.error) break;
          } catch {
            // skip malformed
          }
        }
      }

      // Finalise — remove streaming flag
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: assembled };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content:
            "Er ging iets mis. Probeer het opnieuw of stuur een mail naar [support@quoter.nl](mailto:support@quoter.nl).",
        };
        return updated;
      });
    }

    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Simple markdown: bold **text**, links [text](url)
  function renderContent(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter((p): p is string => p !== undefined);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a key={i} href={linkMatch[2]} className="underline text-brand-600" target="_blank" rel="noreferrer">
            {linkMatch[1]}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[350px] sm:w-[380px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-500 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="font-semibold text-sm">Quoter Hulp</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-brand-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-500 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content ? (
                    <span className="whitespace-pre-wrap">
                      {renderContent(msg.content)}
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm" />
                      )}
                    </span>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-200 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Stel een vraag..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Escalation footer */}
          <p className="text-xs text-slate-400 text-center pb-2">
            Geen antwoord?{" "}
            <a href="mailto:support@quoter.nl" className="text-brand-500 hover:underline">
              support@quoter.nl
            </a>
          </p>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-3 rounded-full shadow-lg transition hover:shadow-xl"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && <span className="text-sm font-medium">Hulp nodig?</span>}
      </button>
    </>
  );
}
