"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { siteNavigation } from "@/data/site-content";

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function menuId(label: string) {
  return `zas-menu-${label.toLowerCase().replaceAll(" ", "-")}`;
}

export function SiteNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const desktopTriggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setMenuOpen(false);
    setOpenDropdown(null);
  }

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setOpenDropdown(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const closeOnEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    if (openDropdown) {
      event.preventDefault();
      event.stopPropagation();
      setOpenDropdown(null);
      if (menuOpen) {
        headerRef.current
          ?.querySelector<HTMLButtonElement>(".zas-mobile-nav-parent[aria-expanded='true']")
          ?.focus();
      } else {
        desktopTriggers.current[openDropdown]?.focus();
      }
      return;
    }

    if (menuOpen) {
      event.preventDefault();
      setMenuOpen(false);
      menuToggleRef.current?.focus();
    }
  };

  const toggleDropdown = (label: string, firstLinkId: string) => {
    const nextOpen = openDropdown === label ? null : label;
    setOpenDropdown(nextOpen);
    if (nextOpen && !menuOpen) {
      window.requestAnimationFrame(() => {
        document.getElementById(firstLinkId)?.querySelector("a")?.focus();
      });
    }
  };

  return (
    <header
      className={`zas-navbar home-design-navbar${scrolled ? " is-scrolled" : ""}`}
      onKeyDown={closeOnEscape}
      ref={headerRef}
    >
      <div className="zas-navbar-inner">
        <Link className="zas-brand" href="/" aria-label="Zamzameena Ainsa Synergy home">
          <Image
            src="/images/figma/zas-mark.webp"
            alt=""
            width={40}
            height={40}
            priority
          />
        </Link>

        <nav className="zas-desktop-nav" aria-label="Main navigation">
          {siteNavigation.map((item) => {
            if (!item.children) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            }

            const expanded = openDropdown === item.label;
            const id = menuId(item.label);
            const isCurrent = item.children.some((child) =>
              isActivePath(pathname, child.href),
            );

            return (
              <div className="zas-nav-dropdown" key={item.label}>
                <button
                  aria-controls={id}
                  aria-expanded={expanded}
                  className={`zas-nav-dropdown-trigger${isCurrent ? " is-current" : ""}`}
                  onClick={() => toggleDropdown(item.label, id)}
                  ref={(node) => {
                    desktopTriggers.current[item.label] = node;
                  }}
                  type="button"
                >
                  {item.label}
                  <span aria-hidden="true">⌄</span>
                </button>
                <div className="zas-nav-dropdown-menu" hidden={!expanded} id={id}>
                  {item.children.map((child) => (
                    <Link
                      aria-current={pathname === child.href ? "page" : undefined}
                      href={child.href}
                      key={child.href}
                      onClick={() => setOpenDropdown(null)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="zas-navbar-actions">
          <Link className="zas-nav-cta" href="/contact">Contact Us</Link>
          <button
            className={`zas-menu-toggle${menuOpen ? " is-open" : ""}`}
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="zas-mobile-menu"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setOpenDropdown(null);
            }}
            ref={menuToggleRef}
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
        {siteNavigation.map((item) => {
          if (!item.children) {
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
                <span aria-hidden="true">↗</span>
              </Link>
            );
          }

          const expanded = openDropdown === item.label;
          const id = `${menuId(item.label)}-mobile`;
          const isCurrent = item.children.some((child) =>
            isActivePath(pathname, child.href),
          );

          return (
            <div className="zas-mobile-nav-group" key={item.label}>
              <button
                aria-controls={id}
                aria-expanded={expanded}
                className={`zas-mobile-nav-parent${isCurrent ? " is-current" : ""}`}
                onClick={() => {
                  setOpenDropdown(expanded ? null : item.label);
                }}
                type="button"
              >
                {item.label}
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
              <div className="zas-mobile-submenu" hidden={!expanded} id={id}>
                {item.children.map((child) => (
                  <Link
                    aria-current={pathname === child.href ? "page" : undefined}
                    href={child.href}
                    key={child.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        <Link
          className="zas-mobile-cta"
          href="/contact"
          onClick={() => setMenuOpen(false)}
        >
          Contact Us
        </Link>
      </nav>
    </header>
  );
}
