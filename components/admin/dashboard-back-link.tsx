"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardBackLink() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname === "/admin/login") return null;

  return (
    <Link
      aria-label="Kembali ke Dashboard Admin"
      className="zas-admin-dashboard-back-link"
      href="/admin"
    >
      <span aria-hidden="true">←</span>
      Kembali ke Dashboard
    </Link>
  );
}
