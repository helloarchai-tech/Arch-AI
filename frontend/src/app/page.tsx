"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ArrowRight,
  Cpu,
  Sparkles,
  AlertTriangle,
  ShieldX,
  Database,
  Layers,
  Zap,
  MessageSquare,
  Code2,
  BrainCircuit,
  Linkedin,
  Mail,
  Menu,
  X,
  ChevronRight,
  Star,
  Quote,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";

/* ──────────────────────────────────────────────────────────── */
/*  Constants                                                  */
/* ──────────────────────────────────────────────────────────── */
const MISTAKES = [
  {
    icon: AlertTriangle,
    title: "No Architecture Planning",
    desc: "Jumping straight to code without a system design leads to costly rewrites, scaling failures, and technical debt that compounds with every sprint.",
  },
  {
    icon: ShieldX,
    title: "Security as an Afterthought",
    desc: "Adding auth, encryption, and access control later is 10x harder. Most breaches happen because security wasn't baked into the architecture from day one.",
  },
  {
    icon: Database,
    title: "Wrong Database Choices",
    desc: "Picking a database without understanding data patterns leads to performance bottlenecks. Relational vs. NoSQL vs. graph — the architecture decides this.",
  },
  {
    icon: Layers,
    title: "Monolith Coupling",
    desc: "Building everything as one tightly coupled system makes it impossible to scale individual features. Clear service boundaries matter from the start.",
  },
  {
    icon: Zap,
    title: "Ignoring Scale Requirements",
    desc: "An architecture that works for 100 users will collapse at 100,000. Caching, load balancing, and async processing must be designed, not bolted on later.",
  },
];

const REVIEWS = [
  { name: "Alex Chen", role: "CTO, NovaTech", text: "Arch.AI saved our team 3 weeks of architecture debates. The AI understood our fintech requirements perfectly and suggested patterns we hadn't considered.", stars: 5 },
  { name: "Sarah Kim", role: "Lead Engineer, CloudPeak", text: "We used Arch.AI for our IoT platform redesign. The component breakdown and tech stack recommendations were spot-on for our sensor data pipeline.", stars: 5 },
  { name: "Marcus Rivera", role: "Founder, DataFlow", text: "As a solo founder, I couldn't afford an architecture consultant. Arch.AI gave me a production-grade design that our investors were impressed by.", stars: 5 },
  { name: "Priya Sharma", role: "VP Engineering, ScaleUp AI", text: "The walkthrough feature is brilliant — it helped our junior devs understand why each component exists. Worth every minute spent on it.", stars: 5 },
  { name: "James Okafor", role: "DevOps Lead, ShipFast", text: "Finally, an architecture tool that actually understands modern cloud-native patterns. The Kubernetes suggestions were exactly what we needed.", stars: 4 },
  { name: "Emily Zhang", role: "Product Manager, BuildRight", text: "I can now have architecture conversations with our engineering team using Arch.AI diagrams. It bridges the gap between product vision and technical execution.", stars: 5 },
];

const STEPS = [
  { num: "01", title: "Describe Your Idea", desc: "Tell us about your product in plain English — features, scale, constraints. No technical jargon needed.", icon: MessageSquare },
  { num: "02", title: "AI Analyzes & Designs", desc: "Our AI architect reasons through layers, picks technologies, and designs component relationships specific to your product.", icon: BrainCircuit },
  { num: "03", title: "Get Your Architecture", desc: "Receive a complete, interactive system diagram with tech stack, walkthrough, and the ability to ask follow-up questions.", icon: Code2 },
];

/* ──────────────────────────────────────────────────────────── */
/*  Animated section wrapper                                   */
/* ──────────────────────────────────────────────────────────── */
function FadeInSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Landing Page                                               */
/* ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const reviewTrackRef = useRef<HTMLDivElement>(null);

  // Show auth modal for unauthenticated users after a short delay
  useEffect(() => {
    if (!loading && !user) {
      const t = setTimeout(() => setShowAuthModal(true), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, user]);

  const launch = () => {
    // If not logged in, prompt to sign in first
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    router.push("/dashboard");
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileNav(false);
  };

  // Auto-scroll reviews
  useEffect(() => {
    const track = reviewTrackRef.current;
    if (!track) return;
    let pos = 0;
    const speed = 0.5;
    let raf: number;
    const step = () => {
      pos += speed;
      if (pos >= track.scrollWidth / 2) pos = 0;
      track.style.transform = `translateX(-${pos}px)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="landing-page">
      {/* ─── Navigation ─── */}
      <nav className="landing-nav">
        <div className="nav-inner">
          <div className="nav-brand" onClick={() => scrollTo("hero")}>
            <div className="brand-icon"><Cpu size={18} /></div>
            <div>
              <div className="brand-name">Arch.AI</div>
              <div className="brand-tagline">AI Architecture Designer</div>
            </div>
          </div>

          <div className="nav-links hide-mobile">
            <button onClick={() => scrollTo("features")}>Features</button>
            <button onClick={() => scrollTo("how-it-works")}>How It Works</button>
            <button onClick={() => scrollTo("about")}>About</button>
            <button onClick={() => scrollTo("contact")}>Contact</button>
          </div>

          <div className="nav-actions">
            {user ? (
              <div className="nav-user">
                <span className="user-greeting">Hi, {user.user_metadata?.full_name?.split(" ")[0] || "there"}</span>
              </div>
            ) : (
              <button className="btn-google hide-mobile" onClick={signInWithGoogle}>
                <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                Continue with Google
              </button>
            )}
            <button className="mobile-menu-btn show-mobile-only" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileNav && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mobile-nav-drawer"
            >
              <button onClick={() => scrollTo("features")}>Features</button>
              <button onClick={() => scrollTo("how-it-works")}>How It Works</button>
              <button onClick={() => scrollTo("about")}>About</button>
              <button onClick={() => scrollTo("contact")}>Contact</button>
              {!user && (
                <button className="btn-google-mobile" onClick={signInWithGoogle}>
                  <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                  Continue with Google
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── Hero ─── */}
      <section id="hero" className="hero-section">
        <div className="hero-bg-gradient" />
        <div className="hero-inner">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="hero-content">
            <div className="hero-badge">
              <Sparkles size={13} />
              AI-Powered System Design
            </div>
            <h1 className="hero-title">
              Stop Guessing.<br />
              <span className="gradient-text">Design Your Architecture</span><br />
              With AI Precision.
            </h1>
            <p className="hero-subtitle">
              Arch.AI transforms your product idea into a crystal-clear, production-grade system
              architecture — complete with tech stack, component relationships, and an interactive
              walkthrough. No more architecture mistakes.
            </p>
            <div className="hero-ctas">
              <button className="btn-primary" onClick={() => scrollTo("prompt-section")}>
                Design My Architecture <ArrowRight size={16} />
              </button>
              <button className="btn-secondary" onClick={() => scrollTo("how-it-works")}>
                See How It Works
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat"><span className="stat-num">10+</span><span className="stat-label">Architecture Domains</span></div>
              <div className="stat-divider" />
              <div className="stat"><span className="stat-num">50+</span><span className="stat-label">Tech Stack Options</span></div>
              <div className="stat-divider" />
              <div className="stat"><span className="stat-num">∞</span><span className="stat-label">Unique Designs</span></div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="hero-visual"
          >
            <div className="hero-diagram-mock">
              <div className="diagram-header">
                <div className="diagram-dot red" />
                <div className="diagram-dot yellow" />
                <div className="diagram-dot green" />
                <span>architecture.diagram</span>
              </div>
              <div className="diagram-body">
                <div className="diagram-layer">
                  <span className="layer-label">Client</span>
                  <div className="mock-node">Web App</div>
                  <div className="mock-node">Mobile App</div>
                </div>
                <div className="diagram-arrow">↓</div>
                <div className="diagram-layer">
                  <span className="layer-label">Gateway</span>
                  <div className="mock-node accent">API Gateway</div>
                  <div className="mock-node accent">Auth Service</div>
                </div>
                <div className="diagram-arrow">↓</div>
                <div className="diagram-layer">
                  <span className="layer-label">Services</span>
                  <div className="mock-node">Order Engine</div>
                  <div className="mock-node">Payment Svc</div>
                  <div className="mock-node">Notification</div>
                </div>
                <div className="diagram-arrow">↓</div>
                <div className="diagram-layer">
                  <span className="layer-label">Data</span>
                  <div className="mock-node data">PostgreSQL</div>
                  <div className="mock-node data">Redis Cache</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Why Architecture Matters ─── */}
      <section id="features" className="section-dark">
        <div className="section-inner">
          <FadeInSection className="section-header">
            <h2 className="section-title">Why Architecture Planning is <span className="gradient-text">Non-Negotiable</span></h2>
            <p className="section-desc">
              80% of software project failures can be traced back to poor architecture decisions.
              These are the mistakes that cost startups millions and enterprises years of rework.
            </p>
          </FadeInSection>

          <div className="mistakes-grid">
            {MISTAKES.map((m, i) => (
              <FadeInSection key={m.title} delay={i * 0.08}>
                <div className="mistake-card">
                  <div className="mistake-icon"><m.icon size={22} /></div>
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution: What ArchAI Does ─── */}
      <section className="section-light">
        <div className="section-inner">
          <FadeInSection className="section-header">
            <h2 className="section-title">Crystal Clear System Design, <span className="gradient-text">Powered by AI</span></h2>
            <p className="section-desc">
              Arch.AI isn&apos;t another diagramming tool. It&apos;s an AI architect that reasons through your
              product requirements and designs a production-grade architecture tailored to YOUR specific needs.
            </p>
          </FadeInSection>

          <div className="features-grid">
            <FadeInSection>
              <div className="feature-card">
                <BrainCircuit size={28} />
                <h3>AI-Driven Reasoning</h3>
                <p>Our AI doesn&apos;t use templates — it reasons through your requirements like a senior architect, choosing specific technologies for YOUR use case.</p>
              </div>
            </FadeInSection>
            <FadeInSection delay={0.1}>
              <div className="feature-card">
                <Layers size={24} />
                <h3>Layered Architecture</h3>
                <p>Client → Gateway → Service → Data → External. Every layer is designed with the right components, properly connected with clear data flow.</p>
              </div>
            </FadeInSection>
            <FadeInSection delay={0.2}>
              <div className="feature-card">
                <Zap size={24} />
                <h3>Interactive Walkthrough</h3>
                <p>Component-by-component guided tour explaining why each piece exists, what technology it uses, and how it connects to the rest of your system.</p>
              </div>
            </FadeInSection>
            <FadeInSection delay={0.3}>
              <div className="feature-card">
                <MessageSquare size={24} />
                <h3>Ask Questions</h3>
                <p>Chat with the AI about YOUR architecture. Ask about scaling, security, alternative technologies — get answers specific to your system design.</p>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="section-dark">
        <div className="section-inner">
          <FadeInSection className="section-header">
            <h2 className="section-title">How It <span className="gradient-text">Works</span></h2>
            <p className="section-desc">From idea to production-grade architecture in 3 simple steps.</p>
          </FadeInSection>

          <div className="steps-row">
            {STEPS.map((s, i) => (
              <FadeInSection key={s.num} delay={i * 0.12}>
                <div className="step-card">
                  <div className="step-num">{s.num}</div>
                  <div className="step-icon"><s.icon size={28} /></div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  {i < STEPS.length - 1 && <ChevronRight size={20} className="step-arrow hide-mobile" />}
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Prompt Terminal ─── */}
      <section id="prompt-section" className="section-prompt">
        <div className="section-inner">
          <FadeInSection className="section-header">
            <h2 className="section-title">Open Your <span className="gradient-text">Dashboard</span></h2>
            <p className="section-desc">
              View existing projects or click New Project in dashboard to enter your prompt and generate architecture.
            </p>
          </FadeInSection>

          <FadeInSection delay={0.15}>
            <div className="prompt-card">
              <label className="prompt-label">
                <Cpu size={14} />
                Project Dashboard
              </label>
              <p className="section-desc" style={{ marginBottom: 16 }}>
                Prompt entry now happens after clicking New Project inside dashboard.
              </p>
              <button onClick={launch} className="btn-primary prompt-btn">
                Open Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ─── Reviews ─── */}
      <section className="section-dark reviews-section">
        <div className="section-inner">
          <FadeInSection className="section-header">
            <h2 className="section-title">What Engineers Are <span className="gradient-text">Saying</span></h2>
          </FadeInSection>
        </div>
        <div className="reviews-marquee">
          <div className="reviews-track" ref={reviewTrackRef}>
            {[...REVIEWS, ...REVIEWS].map((r, i) => (
              <div key={`${r.name}-${i}`} className="review-card">
                <div className="review-stars">
                  {Array.from({ length: r.stars }).map((_, j) => (
                    <Star key={j} size={14} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <Quote size={18} className="review-quote-icon" />
                <p>{r.text}</p>
                <div className="review-author">
                  <div className="review-avatar">{r.name[0]}</div>
                  <div>
                    <div className="review-name">{r.name}</div>
                    <div className="review-role">{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About / Founder ─── */}
      <section id="about" className="section-light">
        <div className="section-inner">
          <FadeInSection className="section-header">
            <h2 className="section-title">About <span className="gradient-text">Arch.AI</span></h2>
            <p className="section-desc">
              We believe every developer deserves access to expert-level architecture planning.
              Arch.AI democratizes system design — making production-grade architecture accessible
              to solo founders, small teams, and enterprises alike.
            </p>
          </FadeInSection>

          <FadeInSection delay={0.15}>
            <div className="founder-card">
              <div className="founder-avatar">A</div>
              <div className="founder-info">
                <h3>TVLS Anirudh</h3>
                <p className="founder-role">Founder, Arch.AI</p>
                <p className="founder-bio">
                  Building the future of software architecture, one AI-designed system at a time.
                  Passionate about making complex engineering decisions accessible to every developer.
                </p>
                <div className="founder-links">
                  <a
                    href="https://www.linkedin.com/in/anirudh-tvls-593752278?utm_source=share_via&utm_content=profile&utm_medium=member_android"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-linkedin"
                  >
                    <Linkedin size={16} /> LinkedIn
                  </a>
                  <a href="mailto:hello.arch.ai@gmail.com" className="btn-email">
                    <Mail size={16} /> hello.arch.ai@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ─── Contact ─── */}
      <section id="contact" className="section-dark">
        <div className="section-inner">
          <FadeInSection className="section-header">
            <h2 className="section-title">Get in <span className="gradient-text">Touch</span></h2>
            <p className="section-desc">Have questions, enterprise needs, or want to collaborate? Drop us a line.</p>
          </FadeInSection>
          <FadeInSection delay={0.1}>
            <div className="contact-info-row">
              <a href="mailto:hello.arch.ai@gmail.com" className="contact-card">
                <Mail size={22} />
                <span>hello.arch.ai@gmail.com</span>
              </a>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Cpu size={16} /> Arch.AI
          </div>
          <div className="footer-copy">
            © {new Date().getFullYear()} Arch.AI — AI-Powered Architecture Design
          </div>
          <div className="footer-links">
            <a href="mailto:hello.arch.ai@gmail.com">Contact</a>
            <a href="https://www.linkedin.com/in/anirudh-tvls-593752278" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
      </footer>

      {/* ─── Google Auth Modal ─── */}
      <AnimatePresence>
        {showAuthModal && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="auth-modal-backdrop"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="auth-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="auth-modal-close" onClick={() => setShowAuthModal(false)}>
                <X size={18} />
              </button>
              <div className="auth-modal-icon">
                <BrainCircuit size={32} />
              </div>
              <h3>Welcome to Arch.AI</h3>
              <p>Sign in to design, save, and iterate on your system architectures.</p>
              <button className="btn-google-large" onClick={signInWithGoogle}>
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                Continue with Google
              </button>
              <p className="auth-modal-skip" onClick={() => setShowAuthModal(false)}>
                or browse without signing in
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
