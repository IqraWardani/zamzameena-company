"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { homeNavigation } from "@/data/home-page";
import { siteNavigation } from "@/data/site-content";

type SiteNavbarProps = {
  variant?: "default" | "home-design";
};

export function SiteNavbar({ variant = "default" }: SiteNavbarProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = variant === "home-design" ? homeNavigation : siteNavigation;
  const isHomeDesign = variant === "home-design";

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className={`zas-navbar${scrolled ? " is-scrolled" : ""}${isHomeDesign ? " home-design-navbar" : ""}`}>
      <div className="zas-navbar-inner">
        <Link className="zas-brand" href="/" aria-label="Zamzameena Ainsa Synergy home">
          <Image
            src={isHomeDesign ? "/images/figma/zas-mark.webp" : "/assets/logo.svg"}
            alt=""
            width={40}
            height={40}
            priority
          />
          {!isHomeDesign ? <span>Zamzameena</span> : null}
        </Link>

        <nav className="zas-desktop-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="zas-navbar-actions">
          <Link className="zas-nav-cta" href={isHomeDesign ? "/contact" : "/business"}>
            {isHomeDesign ? "Contact Us" : "Partner With Us"}
            {!isHomeDesign ? <span aria-hidden="true">↗</span> : null}
          </Link>
          <button
            className={`zas-menu-toggle${menuOpen ? " is-open" : ""}`}
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="zas-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <nav
        className={`zas-mobile-nav${menuOpen ? " is-open" : ""}`}
        id="zas-mobile-menu"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
        <Link
          className="zas-mobile-cta"
          href={isHomeDesign ? "/contact" : "/business"}
          onClick={() => setMenuOpen(false)}
        >
          {isHomeDesign ? "Contact Us" : "Partner With Us"} <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </header>
  );
}
