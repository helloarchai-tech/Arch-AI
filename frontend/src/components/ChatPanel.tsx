"use client";

import { useState, useRef, useEffect } from "react";
import { Send, BrainCircuit, User } from "lucide-react";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    onSend: (message: string) => void;
}

export default function ChatPanel({ messages, onSend }: ChatPanelProps) {
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        const msg = input.trim();
        setInput("");
        setSending(true);
        await onSend(msg);
        setSending(false);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[rgba(99,102,241,0.1)] flex items-center gap-2">
                <BrainCircuit size={18} className="text-[#a5b4fc]" />
                <span className="text-sm font-semibold">AI Architect</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10b981]">
                    Online
                </span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                        {msg.role === "assistant" && (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shrink-0 mt-0.5">
                                <BrainCircuit size={14} className="text-white" />
                            </div>
                        )}
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                    ? "bg-[rgba(99,102,241,0.2)] text-white rounded-br-md"
                                    : "bg-[rgba(255,255,255,0.03)] border border-[rgba(99,102,241,0.08)] text-[var(--color-dark-100)] rounded-bl-md"
                                }`}
                        >
                            {msg.content.split("\n").map((line, j) => (
                                <span key={j}>
                                    {line.startsWith("**") && line.endsWith("**") ? (
                                        <strong className="text-white">{line.replace(/\*\*/g, "")}</strong>
                                    ) : line.startsWith("• ") || line.startsWith("- ") ? (
                                        <span className="block ml-2">{line}</span>
                                    ) : (
                                        line
                                    )}
                                    {j < msg.content.split("\n").length - 1 && <br />}
                                </span>
                            ))}
                        </div>
                        {msg.role === "user" && (
                            <div className="w-7 h-7 rounded-lg bg-[rgba(99,102,241,0.15)] flex items-center justify-center shrink-0 mt-0.5">
                                <User size={14} className="text-[#a5b4fc]" />
                            </div>
                        )}
                    </div>
                ))}
                {sending && (
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shrink-0">
                            <BrainCircuit size={14} className="text-white" />
                        </div>
                        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(99,102,241,0.08)] rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#a5b4fc] animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-2 h-2 rounded-full bg-[#a5b4fc] animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-2 h-2 rounded-full bg-[#a5b4fc] animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[rgba(99,102,241,0.1)]">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSend();
                        }}
                        placeholder="Ask about your architecture..."
                        className="flex-1 bg-[rgba(18,18,28,0.6)] border border-[rgba(99,102,241,0.15)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-dark-300)] outline-none focus:border-[rgba(99,102,241,0.4)] transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center hover:shadow-lg hover:shadow-[rgba(99,102,241,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        <Send size={16} className="text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
