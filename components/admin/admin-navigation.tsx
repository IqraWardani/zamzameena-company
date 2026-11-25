"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavigationItem } from "@/lib/admin/navigation-items";

export function AdminNavigation({ items }: { items: AdminNavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi Admin" className="zas-admin-navigation">
      {[
        { href: "/admin", label: "Dashboard" },
        ...items,
      ].map((item) => {
        const isActive = item.href === "/admin"
          ? pathname === "/admin"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "is-active" : undefined}
            href={item.href}
            key={item.href}
            prefetch={true}
          >
            {item.label}
            <span aria-hidden="true">↗</span>
          </Link>
        );
      })}
    </nav>
  );
}
