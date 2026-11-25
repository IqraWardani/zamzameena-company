"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { AdminNavigationItem } from "@/lib/admin/navigation-items";

export function AdminNavigation({ items }: { items: AdminNavigationItem[] }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    ...items,
  ];

  return (
    <nav aria-label="Navigasi Admin" className="zas-admin-navigation">
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`zas-admin-nav-item ${isActive ? "is-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {isActive && (
              <motion.span
                aria-hidden="true"
                className="zas-admin-nav-pill"
                layoutId="zas-admin-active-pill"
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 35,
                }}
              />
            )}
            <span className="zas-admin-nav-label">{item.label}</span>
            <span aria-hidden="true" className="zas-admin-nav-arrow">
              ↗
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
