"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, User, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const links = [
        { href: "/", label: "Home", icon: Cpu },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                        <Cpu size={18} className="text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">
                        Arch<span className="gradient-text">AI</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((link) => {
                        const active = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                                    ? "bg-[rgba(99,102,241,0.15)] text-[#a5b4fc]"
                                    : "text-[var(--color-dark-200)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
                                    }`}
                            >
                                <link.icon size={16} />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                {/* User avatar / Pro badge */}
                <div className="hidden md:flex items-center gap-3">
                    <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-medium">
                        PRO
                    </span>
                    <button className="w-9 h-9 rounded-full bg-[rgba(99,102,241,0.15)] flex items-center justify-center hover:bg-[rgba(99,102,241,0.25)] transition-colors">
                        <User size={16} className="text-[#a5b4fc]" />
                    </button>
                </div>

                {/* Mobile toggle */}
                <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden glass border-t border-[rgba(99,102,241,0.1)] px-6 py-4 space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-[var(--color-dark-100)] hover:bg-[rgba(99,102,241,0.1)] transition-colors"
                        >
                            <link.icon size={16} />
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}
        </nav>
    );
}
