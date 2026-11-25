"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

function AdminContentAnimator({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="zas-admin-page-transition"
      exit={{ opacity: shouldReduceMotion ? 1 : 0.95 }}
      initial={{ opacity: shouldReduceMotion ? 1 : 0.95, y: shouldReduceMotion ? 0 : 4 }}
      key={pathname}
      transition={{
        duration: shouldReduceMotion ? 0.01 : 0.18,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

export function AdminPageTransition({ children }: { children: ReactNode }) {
  return <AdminContentAnimator>{children}</AdminContentAnimator>;
}
