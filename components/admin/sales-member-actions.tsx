"use client";

import { useState } from "react";
import {
  deleteOrDeactivateSalesMember,
  toggleSalesMemberStatus,
} from "@/lib/sales/actions";

export function SalesMemberActions({
  eventId,
  memberId,
  active,
  memberName,
}: {
  eventId: string;
  memberId: string;
  active: boolean;
  memberName: string;
}) {
  const [message, setMessage] = useState("");

  return (
    <div className="zas-sales-actions">
      <form action={toggleSalesMemberStatus.bind(null, eventId, memberId)}>
        <button className="zas-admin-secondary-button" type="submit">
          {active ? "Nonaktifkan" : "Aktifkan"}
        </button>
      </form>
      <form
        action={async () => {
          if (!window.confirm(`Hapus atau nonaktifkan ${memberName}? Riwayat transaksi akan dipertahankan.`)) {
            return;
          }
          await deleteOrDeactivateSalesMember(eventId, memberId);
          setMessage("Tindakan berhasil.");
        }}
      >
        <button className="zas-admin-danger-button" type="submit">
          Hapus
        </button>
      </form>
      {message && <span role="status">{message}</span>}
    </div>
  );
}

export function ReferralCopyButtons({
  code,
  link,
}: {
  code: string;
  link: string;
}) {
  const [copied, setCopied] = useState("");
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} disalin.`);
    } catch {
      setCopied(`Tidak dapat menyalin ${label.toLowerCase()}.`);
    }
  }

  return (
    <div className="zas-sales-copy-tools">
      <code>{code}</code>
      <button
        className="zas-admin-secondary-button"
        onClick={() => copy(code, "Kode referral")}
        type="button"
      >
        Salin kode
      </button>
      <button
        className="zas-admin-secondary-button"
        onClick={() => copy(`${window.location.origin}${link}`, "Link referral")}
        type="button"
      >
        Salin link
      </button>
      <a className="zas-admin-secondary-button" href={link} rel="noreferrer" target="_blank">
        Buka link referral
      </a>
      {copied && <span role="status">{copied}</span>}
    </div>
  );
}
