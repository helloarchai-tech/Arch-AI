"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Sparkles, Wand2 } from "lucide-react";
import LandingArchitecturePreview from "@/components/archai/LandingArchitecturePreview";
import NeuralBackdrop from "@/components/archai/NeuralBackdrop";

const HINTS = [
  "AI SaaS with multi-tenant auth and billing",
  "Smart irrigation voice assistant with weather intelligence",
  "Realtime fintech fraud detection with Kafka + graph DB",
];
const RECENT = ["Organizational Knowledge Fabric", "Smart Irrigation AI", "Realtime API Hub"];
const SAVED = ["Core Platform v4", "Payments Refactor", "Onboarding Graph"];
const TEMPLATES = ["Event-Driven SaaS", "RAG Knowledge Platform", "Fintech Compliance Stack"];

export default function LandingPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [contact, setContact] = useState({
    name: "",
    subject: "",
    email: "",
    message: "",
  });

  const typePreview = useMemo(() => {
    if (prompt.trim()) return prompt;
    return HINTS[0];
  }, [prompt]);

  const launch = () => {
    const value = prompt.trim();
    if (!value) return;
    const projectId = `proj_${Date.now().toString(36)}`;
    sessionStorage.setItem("Arch.AI_pending_idea", value);
    sessionStorage.setItem(`Arch.AI_pending_idea_${projectId}`, value);
    localStorage.setItem(`Arch.AI_pending_idea_${projectId}`, value);
    localStorage.setItem(`Arch.AI_prompt_${projectId}`, value);
    localStorage.setItem("Arch.AI_last_prompt", value);
    router.push(`/architecture/${projectId}`);
  };

  const submitContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Placeholder submit flow for now; wire this to backend/email later.
    alert("Thanks. We received your message.");
    setContact({ name: "", subject: "", email: "", message: "" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-10 pt-8 sm:px-8">
      <NeuralBackdrop />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-cyan-300/45 bg-cyan-300/14 p-2 text-cyan-200">
            <Cpu size={18} />
          </div>
          <div>
            <div className="text-sm font-bold">Arch.AI</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">AI Architecture Copilot</div>
          </div>
        </div>
        <button className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-400/12 px-3 py-2 text-xs font-semibold text-fuchsia-100">
          Viewer Demo
        </button>
      </header>

      <main className="relative z-10 mx-auto mt-14 grid w-full max-w-7xl gap-8 lg:grid-cols-[1.05fr_1fr]">
        <section>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs uppercase tracking-[0.16em] text-cyan-200"
          >
            <Sparkles size={13} />
            Production-Grade by Prompt
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl"
          >
            <span className="neon-gradient-text">Design Production-Grade</span>
            <br />
            Architectures with AI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-5 max-w-xl text-base leading-7 text-slate-300"
          >
            Turn one natural-language idea into a complete layered architecture. Arch.AI calls the AI engine,
            reasons every component, and renders a rich interactive system graph instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="glass-panel neon-border mt-7 rounded-2xl p-4"
          >
            <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-cyan-200">Architecture Prompt Terminal</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Example: "Build a smart irrigation assistant with voice UX, IoT devices, multilingual support, and analytics..."'
              className="h-36 w-full resize-none rounded-xl border border-cyan-300/35 bg-slate-950/85 p-4 text-sm text-slate-100 outline-none transition focus:border-cyan-200 focus:shadow-[0_0_28px_rgba(0,245,255,0.35)]"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {HINTS.map((hint) => (
                <button
                  key={hint}
                  onClick={() => setPrompt(hint)}
                  className="rounded-full border border-slate-500/35 bg-slate-900/65 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"
                >
                  {hint}
                </button>
              ))}
            </div>
            <button
              onClick={launch}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/45 bg-gradient-to-r from-fuchsia-500/30 to-cyan-400/30 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(255,0,255,0.25)]"
            >
              Generate Architecture
              <ArrowRight size={14} />
            </button>
          </motion.div>
        </section>

        <section className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mb-4 flex items-center justify-between"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Live Morphing Preview</h2>
            <div className="flex items-center gap-1 text-[11px] text-slate-300">
              <Wand2 size={13} />
              based on your prompt
            </div>
          </motion.div>
          <LandingArchitecturePreview prompt={typePreview} />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <LandingListCard title="Recent" items={RECENT} />
            <LandingListCard title="Saved Projects" items={SAVED} />
            <LandingListCard title="Templates" items={TEMPLATES} />
          </div>
        </section>
      </main>

      <section className="relative z-10 mx-auto mt-16 grid w-full max-w-7xl gap-6 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl border border-cyan-300/20 p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">What We Do (RKI)</h3>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            Arch.AI uses an RKI approach - <span className="font-semibold text-cyan-100">Requirements, Knowledge, and Implementation</span>.
            We turn plain-English ideas into production-ready architecture maps with components, layers, and relationships.
          </p>
        </div>
        <div className="glass-panel rounded-2xl border border-fuchsia-300/20 p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-200">Why Architecture First</h3>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            System architecture avoids expensive rework. It helps teams define boundaries, data flow, security paths,
            and scaling strategy before writing code - reducing delivery risk, outages, and cost.
          </p>
        </div>
        <div className="glass-panel rounded-2xl border border-emerald-300/20 p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">How We Do It</h3>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            You describe your product. Our AI agent extracts stack decisions, components, and relations.
            Arch.AI then visualizes a complete layered architecture you can review, iterate, and export.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-10 mb-10 w-full max-w-7xl">
        <div className="glass-panel rounded-2xl border border-cyan-300/25 p-6">
          <h3 className="text-xl font-black text-cyan-100">Contact Us</h3>
          <p className="mt-1 text-sm text-slate-300">Have questions, enterprise needs, or want a custom deployment? Send us a message.</p>
          <form onSubmit={submitContact} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              value={contact.name}
              onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
              required
              className="rounded-xl border border-cyan-300/30 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-200"
            />
            <input
              value={contact.subject}
              onChange={(e) => setContact((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Subject"
              required
              className="rounded-xl border border-cyan-300/30 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-200"
            />
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              required
              className="rounded-xl border border-cyan-300/30 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-200 sm:col-span-2"
            />
            <textarea
              value={contact.message}
              onChange={(e) => setContact((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Message"
              required
              rows={5}
              className="rounded-xl border border-cyan-300/30 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-200 sm:col-span-2"
            />
            <button
              type="submit"
              className="rounded-xl border border-fuchsia-300/45 bg-gradient-to-r from-fuchsia-500/25 to-cyan-400/25 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5"
            >
              Submit
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function LandingListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="glass-panel rounded-xl border border-cyan-300/20 p-3">
      <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-cyan-200">{title}</div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item} className="rounded-md border border-slate-500/25 bg-slate-900/55 px-2 py-1.5 text-xs text-slate-200">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

