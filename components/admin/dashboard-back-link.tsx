"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminNavigation } from "@/components/admin/admin-navigation-context";

export function DashboardBackLink() {
  const pathname = usePathname();
  const { isNavigating, targetHref, startNavigation } = useAdminNavigation();

  if (pathname === "/admin" || pathname === "/admin/login") return null;

  const isPendingBack = isNavigating && targetHref === "/admin";

  return (
    <Link
      aria-label="Kembali ke Dashboard Admin"
      className={`zas-admin-dashboard-back-link ${isPendingBack ? "is-pending" : ""}`}
      href="/admin"
      onClick={() => {
        if (pathname !== "/admin") {
          startNavigation("/admin");
        }
      }}
    >
      <span aria-hidden="true">
        {isPendingBack ? (
          <svg
            className="zas-admin-back-spinner"
            fill="none"
            height="14"
            viewBox="0 0 24 24"
            width="14"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
        ) : (
          "←"
        )}
      </span>
      {isPendingBack ? "Memuat..." : "Kembali ke Dashboard"}
    </Link>
  );
}
