"use client";

import { motion } from "framer-motion";

interface NeuralBackdropProps {
  dense?: boolean;
}

const POINTS = Array.from({ length: 34 }).map((_, idx) => ({
  id: idx,
  left: `${(idx * 37) % 100}%`,
  top: `${(idx * 61) % 100}%`,
  delay: (idx % 9) * 0.22,
  duration: 3 + (idx % 6) * 0.55,
}));

export default function NeuralBackdrop({ dense = false }: NeuralBackdropProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="space-grid opacity-40" />
      {POINTS.slice(0, dense ? POINTS.length : 18).map((point) => (
        <motion.span
          key={point.id}
          className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300/80"
          style={{ left: point.left, top: point.top, boxShadow: "0 0 12px rgba(0,245,255,0.7)" }}
          initial={{ opacity: 0.16, scale: 0.8 }}
          animate={{ opacity: [0.14, 1, 0.14], scale: [0.78, 1.2, 0.78] }}
          transition={{ duration: point.duration, delay: point.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
