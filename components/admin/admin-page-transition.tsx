"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  AdminNavigationProvider,
  useAdminNavigation,
} from "@/components/admin/admin-navigation-context";

function AdminProgressBar() {
  const { isNavigating } = useAdminNavigation();
  const [visible, setVisible] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isNavigating) {
      setVisible(true);
      setProgressWidth(0);

      // Rapidly go to 25%, then 65%, then trickle to 85%
      const step1 = setTimeout(() => setProgressWidth(30), 50);
      const step2 = setTimeout(() => setProgressWidth(65), 350);
      const step3 = setTimeout(() => setProgressWidth(85), 1200);

      return () => {
        clearTimeout(step1);
        clearTimeout(step2);
        clearTimeout(step3);
      };
    } else if (visible) {
      // Completed
      setProgressWidth(100);
      timer = setTimeout(() => {
        setVisible(false);
        setProgressWidth(0);
      }, 300);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isNavigating, visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="zas-admin-progress-bar-wrap"
    >
      <motion.div
        animate={{
          width: `${progressWidth}%`,
          opacity: progressWidth === 100 && !isNavigating ? 0 : 1,
        }}
        className="zas-admin-progress-bar"
        initial={{ width: "0%", opacity: 1 }}
        transition={{
          width: {
            duration: progressWidth === 100 ? 0.2 : progressWidth > 65 ? 2.5 : 0.4,
            ease: [0.16, 1, 0.3, 1],
          },
          opacity: { duration: 0.25, delay: progressWidth === 100 ? 0.15 : 0 },
        }}
      />
    </div>
  );
}

function AdminFloatingLoadingBadge() {
  const { isNavigating } = useAdminNavigation();
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isNavigating) {
      // Brief debounce (120ms) so instant navigations don't cause flicker
      timer = setTimeout(() => {
        setShowBadge(true);
      }, 120);
    } else {
      setShowBadge(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isNavigating]);

  return (
    <AnimatePresence>
      {showBadge && (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          aria-live="polite"
          className="zas-admin-floating-loading"
          exit={{ opacity: 0, y: -16, scale: 0.92 }}
          initial={{ opacity: 0, y: -20, scale: 0.92 }}
          role="status"
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="zas-admin-floating-spinner" aria-hidden="true">
            <svg
              fill="none"
              height="16"
              viewBox="0 0 24 24"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="3"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
          </span>
          <span className="zas-admin-floating-text">Memuat data...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AdminContentAnimator({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="zas-admin-page-transition"
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      key={pathname}
      transition={{
        duration: shouldReduceMotion ? 0.05 : 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function AdminPageTransition({ children }: { children: ReactNode }) {
  return (
    <AdminNavigationProvider>
      <AdminProgressBar />
      <AdminFloatingLoadingBadge />
      <AdminContentAnimator>{children}</AdminContentAnimator>
    </AdminNavigationProvider>
  );
}
