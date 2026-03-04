"use client";

import { Download, FileJson, FileImage, FileText, FileCode2 } from "lucide-react";
import { useState } from "react";
import { toPlantUML } from "@/utils/uml";

interface ExportControlsProps {
    architecture?: { nodes?: any[]; edges?: any[]; title?: string };
}

export default function ExportControls({ architecture }: ExportControlsProps) {
    const [open, setOpen] = useState(false);

    const exportPNG = async () => {
        try {
            const { toPng } = await import("html-to-image");
            const canvas = document.getElementById("architecture-canvas");
            if (!canvas) return;
            const dataUrl = await toPng(canvas, { backgroundColor: "#0a0a0f" });
            const link = document.createElement("a");
            link.download = "architecture.png";
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("PNG export failed:", err);
        }
        setOpen(false);
    };

    const exportPDF = async () => {
        try {
            const { toPng } = await import("html-to-image");
            const { default: jsPDF } = await import("jspdf");
            const canvas = document.getElementById("architecture-canvas");
            if (!canvas) return;
            const dataUrl = await toPng(canvas, { backgroundColor: "#0a0a0f" });
            const pdf = new jsPDF("landscape", "mm", "a4");
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = (imgProps.height * pdfW) / imgProps.width;
            pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
            pdf.save("architecture.pdf");
        } catch (err) {
            console.error("PDF export failed:", err);
        }
        setOpen(false);
    };

    const exportJSON = () => {
        try {
            const stored = sessionStorage.getItem("archai_project");
            const data = architecture || (stored ? JSON.parse(stored) : { message: "Architecture data" });
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            link.download = "architecture.json";
            link.href = URL.createObjectURL(blob);
            link.click();
        } catch (err) {
            console.error("JSON export failed:", err);
        }
        setOpen(false);
    };

    const exportPuml = () => {
        try {
            const puml = toPlantUML(architecture?.nodes || [], architecture?.edges || []);
            const blob = new Blob([puml], { type: "text/plain" });
            const link = document.createElement("a");
            link.download = "architecture.puml";
            link.href = URL.createObjectURL(blob);
            link.click();
        } catch (err) {
            console.error("PUML export failed:", err);
        }
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="btn-secondary flex items-center gap-2 text-xs py-2 px-3"
            >
                <Download size={14} /> Export
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 glass rounded-xl p-1 min-w-[160px]">
                        <button
                            onClick={exportPNG}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-dark-100)] hover:bg-[rgba(99,102,241,0.1)] rounded-lg transition-colors"
                        >
                            <FileImage size={14} className="text-[#6366f1]" /> Export PNG
                        </button>
                        <button
                            onClick={exportPDF}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-dark-100)] hover:bg-[rgba(99,102,241,0.1)] rounded-lg transition-colors"
                        >
                            <FileText size={14} className="text-[#8b5cf6]" /> Export PDF
                        </button>
                        <button
                            onClick={exportJSON}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-dark-100)] hover:bg-[rgba(99,102,241,0.1)] rounded-lg transition-colors"
                        >
                        <FileJson size={14} className="text-[#10b981]" /> Export JSON
                    </button>
                    <button
                        onClick={exportPuml}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-dark-100)] hover:bg-[rgba(99,102,241,0.1)] rounded-lg transition-colors"
                    >
                        <FileCode2 size={14} className="text-[#f472b6]" /> Export UML (.puml)
                    </button>
                </div>
            </>
        )}
        </div>
    );
}
