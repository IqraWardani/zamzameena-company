import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { ScrollRevealObserver } from "@/components/scroll-reveal-observer";

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="zas-site">
      <a className="zas-skip-link" href="#main-content">Skip to content</a>
      <SiteNavbar />
      <ScrollRevealObserver />
      {children}
      <SiteFooter />
    </div>
  );
}
