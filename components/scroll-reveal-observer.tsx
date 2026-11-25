"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollRevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        element.classList.add("is-visible");
      });
      return;
    }

    root.classList.add("zas-motion-ready");

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 40px 0px" },
    );

    const observeUnrevealed = () => {
      const elements = document.querySelectorAll<HTMLElement>(
        "[data-reveal]:not(.is-visible)",
      );
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          element.classList.add("is-visible");
        } else {
          observer.observe(element);
        }
      });
    };

    observeUnrevealed();
    const rafId = requestAnimationFrame(observeUnrevealed);

    const mutationObserver = new MutationObserver(() => {
      observeUnrevealed();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(rafId);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}

