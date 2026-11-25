"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAdminNavigation } from "@/components/admin/admin-navigation-context";
import type { AdminNavigationItem } from "@/lib/admin/navigation-items";

export function AdminNavigation({ items }: { items: AdminNavigationItem[] }) {
  const pathname = usePathname();
  const { isNavigating, targetHref, startNavigation } = useAdminNavigation();

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

        const isItemPending =
          isNavigating &&
          (targetHref === item.href ||
            (item.href !== "/admin" && targetHref?.startsWith(`${item.href}/`)));

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`zas-admin-nav-item ${isActive ? "is-active" : ""} ${
              isItemPending ? "is-pending" : ""
            }`}
            href={item.href}
            key={item.href}
            onClick={() => {
              if (item.href !== pathname) {
                startNavigation(item.href);
              }
            }}
          >
            {isActive && (
              <motion.span
                aria-hidden="true"
                className="zas-admin-nav-pill"
                layoutId="zas-admin-active-pill"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 32,
                }}
              />
            )}
            <span className="zas-admin-nav-label">{item.label}</span>
            {isItemPending ? (
              <span
                aria-hidden="true"
                className="zas-admin-nav-spinner"
                title="Memuat..."
              >
                <svg
                  fill="none"
                  height="12"
                  viewBox="0 0 24 24"
                  width="12"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeOpacity="0.3"
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
            ) : (
              <span aria-hidden="true" className="zas-admin-nav-arrow">
                ↗
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
