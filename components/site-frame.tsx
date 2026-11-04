import type { ReactNode } from "react";

type SiteFrameProps = {
  children: ReactNode;
  variant?: "default" | "home-design" | "about-design";
};

export function SiteFrame({ children, variant = "default" }: SiteFrameProps) {
  const usesHomeDesign = variant !== "default";
  const isAboutDesign = variant === "about-design";
  const className = [
    usesHomeDesign && "home-design",
    isAboutDesign && "about-site",
  ]
    .filter(Boolean)
    .join(" ");

  return className ? <div className={className}>{children}</div> : children;
}
