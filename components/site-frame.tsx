import type { ReactNode } from "react";
import { HomeFooter } from "@/components/home/home-footer";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { ScrollRevealObserver } from "@/components/scroll-reveal-observer";

type SiteFrameProps = {
  children: ReactNode;
  variant?: "default" | "home-design" | "about-design";
};

export function SiteFrame({ children, variant = "default" }: SiteFrameProps) {
  const usesHomeDesign = variant !== "default";
  const isAboutDesign = variant === "about-design";

  return (
    <div className={`zas-site${usesHomeDesign ? " home-design" : ""}${isAboutDesign ? " about-site" : ""}`}>
      <a className="zas-skip-link" href="#main-content">Skip to content</a>
      <SiteNavbar variant={usesHomeDesign ? "home-design" : "default"} />
      <ScrollRevealObserver />
      {children}
      {usesHomeDesign ? <HomeFooter /> : <SiteFooter />}
    </div>
  );
}
