"use client";

import { useEffect, useRef, useState } from "react";
import { askQuestion, getAqi } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import { readSymptomChecklistLog } from "@/lib/localSymptomLog";
import { AQI_CATEGORY_LABEL } from "@/lib/display";
import type { AqiResponse, AskContext, AskSource } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources?: AskSource[];
  grounded?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "Is today safe for soccer practice?",
  "What does moderate smoke mean for my asthma?",
  "Should I wear a mask outside?",
  "What is PM2.5?",
  "When should I evacuate?",
];

export default function AskPage() {
  const { lat, lon } = useGeolocation();
  const [aqi, setAqi] = useState<AqiResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lat == null || lon == null) return;
    getAqi(lat, lon)
      .then(setAqi)
      .catch(() => setAqi(null));
  }, [lat, lon]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function buildContext(): AskContext {
    const lastLog = readSymptomChecklistLog().at(-1);
    return {
      aqi: aqi?.aqi ?? null,
      aqi_category: aqi?.category ?? null,
      density_class: lastLog?.density_class ?? null,
      symptom_level: lastLog?.flag_level ?? null,
      symptom_message: lastLog?.flag_message ?? null,
    };
  }

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const result = await askQuestion(trimmed, buildContext());
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer, sources: result.sources, grounded: result.grounded },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong reaching the assistant -- try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-8 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Ask</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Ask open-ended questions about wildfire smoke and your health. Answers are retrieved from
          a small curated knowledge base (modeled on CDC/EPA guidance) -- not a generative model --
          so every answer is grounded in a specific cited passage, never made up.
          {aqi?.aqi != null && (
            <>
              {" "}
              Current conditions: AQI {aqi.aqi} ({AQI_CATEGORY_LABEL[aqi.category]}).
            </>
          )}
        </p>
      </header>

      <div className="card p-5 space-y-4 min-h-[320px]">
        {messages.length === 0 && (
          <div>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              Try a question, or pick one:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuestion(q)}
                  className="text-sm px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className="max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-line"
              style={{
                background: m.role === "user" ? "#e5e7eb" : "var(--surface-2)",
                color: m.role === "user" ? "#111827" : "var(--text-primary)",
              }}
            >
              {m.text}
              {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-2 flex flex-wrap gap-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                  {m.sources.map((s) => (
                    <span
                      key={s.id}
                      title={s.source_label}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--surface-1)", color: "var(--text-muted)" }}
                    >
                      {s.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              Searching guidance...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about AQI, symptoms, masks, filtration..."
          className="flex-1 rounded-full px-4 py-2.5 text-sm"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="text-sm font-medium rounded-full px-5 py-2.5 disabled:opacity-50"
          style={{ background: "#e5e7eb", color: "#111827" }}
        >
          Send
        </button>
      </form>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Answers are retrieved from a small curated set of general wildfire-smoke guidance, not a
        live medical database or a doctor -- for anything about your specific health, follow your
        provider&apos;s guidance over this tool.
      </p>
    </main>
  );
}
