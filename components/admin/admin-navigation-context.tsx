"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type AdminNavigationContextValue = {
  isNavigating: boolean;
  targetHref: string | null;
  startNavigation: (href: string) => void;
  finishNavigation: () => void;
};

const AdminNavigationContext = createContext<AdminNavigationContextValue>({
  isNavigating: false,
  targetHref: null,
  startNavigation: () => {},
  finishNavigation: () => {},
});

export function useAdminNavigation() {
  return useContext(AdminNavigationContext);
}

function NavigationWatcher({ onUrlChange }: { onUrlChange: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevUrlRef = useRef<string>("");

  useEffect(() => {
    const currentUrl = `${pathname}?${searchParams.toString()}`;
    if (prevUrlRef.current && prevUrlRef.current !== currentUrl) {
      onUrlChange();
    }
    prevUrlRef.current = currentUrl;
  }, [pathname, searchParams, onUrlChange]);

  return null;
}

export function AdminNavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const finishNavigation = useCallback(() => {
    clearTimer();
    setIsNavigating(false);
    setTargetHref(null);
  }, [clearTimer]);

  const startNavigation = useCallback(
    (href: string) => {
      clearTimer();
      setIsNavigating(true);
      setTargetHref(href);

      // Safety timeout in case navigation is cancelled or errors (max 10s)
      timeoutRef.current = setTimeout(() => {
        finishNavigation();
      }, 10000);
    },
    [clearTimer, finishNavigation],
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only handle normal left clicks without modifier keys
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      // Skip external, downloads, anchors, actions
      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        rawHref.startsWith("javascript:")
      ) {
        return;
      }

      try {
        const destUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Only handle internal links inside admin
        if (
          destUrl.origin === currentUrl.origin &&
          destUrl.pathname.startsWith("/admin")
        ) {
          // Exclude direct file downloads like xlsx or pdf
          if (
            destUrl.pathname.endsWith(".xlsx") ||
            destUrl.pathname.endsWith(".csv") ||
            destUrl.pathname.endsWith(".pdf")
          ) {
            return;
          }

          // Don't trigger if already at the exact same location
          if (
            destUrl.pathname === currentUrl.pathname &&
            destUrl.search === currentUrl.search
          ) {
            return;
          }

          startNavigation(destUrl.pathname + destUrl.search);
        }
      } catch {
        // Ignore invalid URL parsing
      }
    };

    const handleSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;

      const action = form.getAttribute("action");
      if (
        action &&
        action.startsWith("/admin") &&
        !action.endsWith(".xlsx") &&
        !action.endsWith(".csv")
      ) {
        startNavigation(action);
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("submit", handleSubmit, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("submit", handleSubmit, { capture: true });
    };
  }, [startNavigation]);

  return (
    <AdminNavigationContext.Provider
      value={{
        isNavigating,
        targetHref,
        startNavigation,
        finishNavigation,
      }}
    >
      <Suspense fallback={null}>
        <NavigationWatcher onUrlChange={finishNavigation} />
      </Suspense>
      {children}
    </AdminNavigationContext.Provider>
  );
}
