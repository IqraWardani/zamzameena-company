"use client";

import Link from "next/link";
import { useState } from "react";
import { companyProfile, navItems } from "@/data/company";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Zamzameena home">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-semibold tracking-[0.22em] text-zinc-900">Z</div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-900">ZAMZAMEENA</div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-600 transition hover:text-zinc-900">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/contact" className="hidden rounded-full bg-zinc-950 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white transition hover:bg-zinc-800 sm:inline-flex">
              Become a Partner
            </Link>
            <button
              type="button"
              className="inline-flex rounded-full border border-zinc-300 p-2 text-zinc-900 lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="sr-only">Toggle menu</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div id="mobile-menu" className="border-t border-zinc-200 bg-white lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md px-2 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100" onClick={() => setMobileOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-zinc-200 bg-zinc-950 text-zinc-100">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-xs font-semibold tracking-[0.22em] text-zinc-100">Z</div>
              <div className="text-lg font-semibold uppercase tracking-[0.18em] text-zinc-50">ZAMZAMEENA</div>
            </div>
            <p className="max-w-md text-sm leading-7 text-zinc-300">{companyProfile.shortDescription}</p>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Navigation</p>
            <ul className="space-y-3 text-sm text-zinc-300">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">Contact</p>
            <ul className="space-y-3 text-sm text-zinc-300">
              <li>{companyProfile.email}</li>
              <li>{companyProfile.phone}</li>
              <li>{companyProfile.address}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-800">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 text-xs uppercase tracking-[0.2em] text-zinc-500 sm:px-6 lg:px-8">
            <span>© {new Date().getFullYear()} Zamzameena</span>
            <span>PT Zamzameena Ainsa Synergy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
