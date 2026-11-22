"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getPublicEventPath } from "@/lib/public-events/public";

function subscribeToLocation(): () => void {
  return () => {};
}

function getLocationOrigin(): string {
  return window.location.origin;
}

function getServerOrigin(): string {
  return "";
}

type ReferralSeller = {
  id: string;
  fullName: string;
  position: string;
  region: string;
  referralCode: string;
};

function isReferralSeller(value: unknown): value is ReferralSeller {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value && typeof value.id === "string" &&
      "fullName" in value && typeof value.fullName === "string" &&
      "position" in value && typeof value.position === "string" &&
      "region" in value && typeof value.region === "string" &&
      "referralCode" in value && typeof value.referralCode === "string",
  );
}

function positionLabel(position: string): string {
  switch (position) {
    case "director": return "Direktur Pemasaran";
    case "arm": return "ARM";
    case "branch_manager": return "Kepala Cabang";
    case "sales": return "Sales";
    default: return "Anggota penjualan";
  }
}

export function ReferralLinkSearch({
  eventName,
  eventSlug,
  ticketCode,
}: {
  eventName: string;
  eventSlug: string;
  ticketCode: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReferralSeller[]>([]);
  const [selected, setSelected] = useState<ReferralSeller | null>(null);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const origin = useSyncExternalStore(
    subscribeToLocation,
    getLocationOrigin,
    getServerOrigin,
  );

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || selected) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ eventSlug, q: term });
        const response = await fetch(`/api/referrals/search?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (
          response.ok &&
          payload &&
          typeof payload === "object" &&
          "members" in payload &&
          Array.isArray(payload.members)
        ) {
          setResults(payload.members.filter(isReferralSeller));
          setHasSearched(true);
        } else {
          setResults([]);
          setHasSearched(true);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSearchError("Pencarian belum dapat dilakukan. Silakan coba kembali.");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [eventSlug, query, selected]);

  function referralUrl(seller: ReferralSeller) {
    return `${origin}${getPublicEventPath(
      eventSlug,
      "order",
      ticketCode ?? undefined,
      seller.referralCode,
    )}`;
  }

  async function copyReferralLink() {
    if (!selected || !ticketCode || !origin) return;
    try {
      await navigator.clipboard.writeText(referralUrl(selected));
      setMessage("Link referral berhasil disalin.");
    } catch {
      setMessage("Link tidak dapat disalin. Salin link yang tampil secara manual.");
    }
  }

  const selectedReferralUrl =
    selected && ticketCode && origin
      ? referralUrl(selected)
      : "";
  const shareText = selected
    ? `Halo! Saya ingin mengajak Anda bergabung di ${eventName}.\n\nSilakan lakukan pemesanan tiket melalui link referral saya berikut:\n\n${selectedReferralUrl}`
    : "";
  const whatsappUrl = selected
    ? `https://wa.me/?text=${encodeURIComponent(shareText)}`
    : "";

  return (
    <div className="zas-referral-search">
      <label htmlFor="referral-seller-search">Cari nama penjual</label>
      <input
        autoComplete="off"
        id="referral-seller-search"
        maxLength={80}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setQuery(value);
          setSelected(null);
          setResults([]);
          setSearching(value.trim().length >= 2);
          setMessage("");
          setSearchError("");
          setHasSearched(false);
        }}
        placeholder="Ketik minimal 2 karakter"
        value={query}
      />
      {query.trim().length < 2 && (
        <p className="zas-referral-help">Masukkan minimal 2 karakter nama untuk mencari anggota aktif.</p>
      )}
      {results.length > 0 && (
        <ul className="zas-referral-results">
          {results.map((seller) => (
            <li key={seller.id}>
              <button
                onClick={() => {
                  setSelected(seller);
                  setQuery(seller.fullName);
                  setResults([]);
                  setSearching(false);
                  setMessage("");
                  setSearchError("");
                }}
                type="button"
              >
                <strong>{seller.fullName}</strong>
                <span>
                  {positionLabel(seller.position)} · {seller.region} · {seller.referralCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searching && <p className="zas-referral-help" role="status">Mencari penjual...</p>}
      {searchError && <p className="zas-referral-status" role="alert">{searchError}</p>}
      {query.trim().length >= 2 &&
        hasSearched &&
        !searching &&
        !searchError &&
        !results.length &&
        !selected && (
        <p className="zas-referral-help">Tidak ada anggota aktif yang cocok.</p>
      )}
      {selected && (
        <section className="zas-referral-result" aria-live="polite">
          <p>Penjual terpilih</p>
          <h2>{selected.fullName}</h2>
          <p>
            {positionLabel(selected.position)}
            {selected.region ? ` · ${selected.region}` : ""}
            {" · "}
            <code>{selected.referralCode}</code>
          </p>
          {ticketCode ? (
            <>
              <label htmlFor="personal-referral-link">Link Referral</label>
              <input
                id="personal-referral-link"
                readOnly
                value={selectedReferralUrl}
              />
              <div className="zas-referral-actions">
                <button onClick={copyReferralLink} type="button">
                  Salin Link Referral
                </button>
                <a
                  className="zas-referral-whatsapp"
                  href={whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M20 11.7a8.1 8.1 0 0 1-12 7.1L4 20l1.2-3.8A8.1 8.1 0 1 1 20 11.7Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M9 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4 0 .6l-.5.6c-.2.2-.2.4 0 .6.5.9 1.2 1.6 2.1 2.1.2.1.4.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5 0 .5-.2 1-.6 1.3-.4.4-1 .6-1.6.5-1.2-.2-2.6-.9-3.8-2.1-1.1-1.1-1.8-2.4-2-3.5-.1-.8.1-1.5.4-2Z"
                      fill="currentColor"
                    />
                  </svg>
                  Bagikan via WhatsApp
                </a>
              </div>
            </>
          ) : (
            <p className="zas-referral-help">
              Tiket belum tersedia, jadi link referral untuk halaman order belum dapat dibuat.
            </p>
          )}
        </section>
      )}
      {message && <p className="zas-referral-status" role="status">{message}</p>}
    </div>
  );
}
