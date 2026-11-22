"use client";

import { useActionState, useEffect } from "react";
import { useRef, useState } from "react";
import {
  type PublicRegistrationFormState,
  submitPublicRegistration,
} from "@/app/events/[eventSlug]/register/actions";
import { FormFieldLabel } from "@/components/form-field-label";
import { REGISTRATION_QUESTIONS } from "@/lib/registration/validation";

type PublicTicketOption = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
};

type SellerSearchResult = {
  id: string;
  fullName: string;
  position: string;
  referralCode: string;
};

const initialState: PublicRegistrationFormState = {};

function isSellerSearchResult(value: unknown): value is SellerSearchResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value && typeof value.id === "string" &&
      "fullName" in value && typeof value.fullName === "string" &&
      "position" in value && typeof value.position === "string" &&
      "referralCode" in value && typeof value.referralCode === "string",
  );
}

export function PublicRegistrationForm({
  eventSlug,
  tickets,
  initialReferralCode,
}: {
  eventSlug: string;
  tickets: PublicTicketOption[];
  initialReferralCode: string;
}) {
  const action = submitPublicRegistration.bind(null, eventSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [referralMethod, setReferralMethod] = useState<"code" | "name">(
    initialReferralCode ? "code" : "name",
  );
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [referralMessage, setReferralMessage] = useState("");
  const referralCodeRef = useRef(initialReferralCode);
  const [sellerMemberId, setSellerMemberId] = useState("");
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerResults, setSellerResults] = useState<SellerSearchResult[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<SellerSearchResult | null>(null);
  const [searchingSellers, setSearchingSellers] = useState(false);

  useEffect(() => {
    if (referralMethod !== "name" || sellerSearch.trim().length < 2 || selectedSeller) {
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingSellers(true);
      try {
        const params = new URLSearchParams({ eventSlug, q: sellerSearch.trim() });
        const response = await fetch(`/api/referrals/search?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: unknown = await response.json();
        if (
          response.ok &&
          result &&
          typeof result === "object" &&
          "members" in result &&
          Array.isArray(result.members)
        ) {
          setSellerResults(result.members.filter(isSellerSearchResult));
        } else {
          setSellerResults([]);
        }
      } catch {
        if (!controller.signal.aborted) setReferralMessage("Pencarian penjual belum dapat dilakukan. Coba lagi.");
      } finally {
        if (!controller.signal.aborted) setSearchingSellers(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [eventSlug, referralMethod, sellerSearch, selectedSeller]);

  function sellerPositionLabel(position: string): string {
    switch (position) {
      case "director": return "Direktur Pemasaran";
      case "arm": return "ARM";
      case "branch_manager": return "Kepala Cabang";
      case "sales": return "Sales";
      default: return "Jabatan tidak dikenal";
    }
  }

  if (state.registrationNumber) {
    return (
      <section className="zas-registration-success" aria-labelledby="registration-success-title" aria-live="polite">
        <p className="zas-registration-eyebrow">REGISTRATION RECEIVED</p>
        <h2 id="registration-success-title">You&apos;re registered</h2>
        <p>Keep this registration number for your records.</p>
        <p className="zas-registration-number">{state.registrationNumber}</p>
        {state.invoiceNumber && (
          <div className="zas-registration-invoice-number">
            <span>Invoice number</span>
            <strong>{state.invoiceNumber}</strong>
          </div>
        )}
        {state.emailNotice && (
          <p className="zas-registration-unavailable" role="status">
            {state.emailNotice}
          </p>
        )}
        {state.invoiceNumber && (
          <p>
            <a className="zas-registration-download" href="/participant">
              Preview invoice and payment status
            </a>
          </p>
        )}
      </section>
    );
  }

  return (
    <form
      action={formAction}
      className="zas-registration-form"
      onSubmit={(event) => {
        if (!selectedSeller || !sellerMemberId) {
          event.preventDefault();
          setReferralMessage("Pilih penjual aktif sebelum melanjutkan.");
        }
      }}
      aria-describedby={
        state.error
          ? "registration-error registration-privacy-note"
          : "registration-privacy-note"
      }
    >
      {state.error && (
        <p className="zas-registration-error" id="registration-error" role="alert">
          {state.error}
        </p>
      )}

      <fieldset>
        <legend>Participant details</legend>
        <FormFieldLabel htmlFor="participant-name" required>Full name</FormFieldLabel>
        <input autoComplete="name" id="participant-name" name="fullName" maxLength={160} required />

        <FormFieldLabel htmlFor="participant-email" required>Email address</FormFieldLabel>
        <input autoComplete="email" id="participant-email" name="email" type="email" maxLength={320} required />

        <FormFieldLabel htmlFor="participant-phone" required>Phone number</FormFieldLabel>
        <input autoComplete="tel" id="participant-phone" name="phone" type="tel" maxLength={40} required />

        <label htmlFor="participant-organization">Organization</label>
        <input autoComplete="organization" id="participant-organization" name="organizationName" maxLength={200} />

        <label htmlFor="participant-job-title">Job title</label>
        <input id="participant-job-title" name="jobTitle" maxLength={160} />

        <label htmlFor="participant-city">City</label>
        <input autoComplete="address-level2" id="participant-city" name="city" maxLength={120} />

        <label htmlFor="participant-country">Country code (optional)</label>
        <input
          autoComplete="country"
          id="participant-country"
          name="countryCode"
          pattern="[A-Za-z]{2}"
          maxLength={2}
          placeholder="ID"
        />
      </fieldset>

      <fieldset>
        <legend>Choose a ticket</legend>
        <FormFieldLabel htmlFor="ticket-type" required>Ticket type</FormFieldLabel>
        <select id="ticket-type" name="ticketTypeId" required defaultValue="">
          <option value="" disabled>Select an available ticket</option>
          {tickets.map((ticket) => (
            <option key={ticket.id} value={ticket.id}>
              {ticket.name} — {ticket.price} {ticket.currency}
            </option>
          ))}
        </select>
        {tickets.map((ticket) =>
          ticket.description ? (
            <p className="zas-registration-ticket-note" key={`${ticket.id}-description`}>
              {ticket.name}: {ticket.description}
            </p>
          ) : null,
        )}
      </fieldset>

      <fieldset>
        <legend>Referral</legend>
        <p>Wajib memilih penjual melalui kode referral atau pencarian nama.</p>
        <div className="zas-registration-referral-methods">
          <label>
            <input
              checked={referralMethod === "code"}
              name="referralMethod"
              onChange={() => {
                setReferralMethod("code");
                setSellerMemberId("");
                setSelectedSeller(null);
                setSellerResults([]);
                setSearchingSellers(false);
                setReferralMessage("");
              }}
              type="radio"
              value="code"
            />
            Masukkan kode referral
          </label>
          <label>
            <input
              checked={referralMethod === "name"}
              name="referralMethod"
              onChange={() => {
                setReferralMethod("name");
                setReferralCode("");
                referralCodeRef.current = "";
                setSellerMemberId("");
                setSelectedSeller(null);
                setSellerResults([]);
                setSearchingSellers(false);
                setReferralMessage("");
              }}
              type="radio"
              value="name"
            />
            Cari nama penjual
          </label>
        </div>
        <input name="salesMemberId" type="hidden" value={sellerMemberId} />
        {referralMethod === "code" ? (
          <>
            <FormFieldLabel htmlFor="seller-referral-code" required>Kode Referral Penjual</FormFieldLabel>
            <input
              autoComplete="off"
              id="seller-referral-code"
              name="referralCode"
              maxLength={40}
              placeholder="Contoh: SLS-SPS-001"
              required
              value={referralCode}
              onChange={(event) => {
                const value = event.currentTarget.value.toUpperCase();
                referralCodeRef.current = value;
                setReferralCode(value);
                setSellerMemberId("");
                setSelectedSeller(null);
                setSearchingSellers(false);
                setReferralMessage("");
              }}
              onBlur={async () => {
                const code = referralCode.trim();
                if (!code) {
                  setReferralMessage("");
                  setSellerMemberId("");
                  setSelectedSeller(null);
                  return;
                }
                setReferralMessage("Memeriksa kode referral...");
                try {
                  const params = new URLSearchParams({ eventSlug, code });
                  const response = await fetch(`/api/referrals/validate?${params}`, {
                    cache: "no-store",
                  });
                  const result: unknown = await response.json();
                  if (referralCodeRef.current !== code) return;
                  if (
                    response.ok &&
                    result &&
                    typeof result === "object" &&
                    "valid" in result &&
                    result.valid === true &&
                    "memberId" in result &&
                    typeof result.memberId === "string" &&
                    "fullName" in result &&
                    typeof result.fullName === "string" &&
                    "position" in result &&
                    typeof result.position === "string" &&
                    "referralCode" in result &&
                    typeof result.referralCode === "string"
                  ) {
                    const seller = {
                      id: result.memberId,
                      fullName: result.fullName,
                      position: result.position,
                      referralCode: result.referralCode,
                    };
                    setSellerMemberId(seller.id);
                    setSelectedSeller(seller);
                    setReferralMessage(
                      `Penjual terpilih: ${seller.fullName} (${sellerPositionLabel(seller.position)}).`,
                    );
                  } else {
                    setSellerMemberId("");
                    setSelectedSeller(null);
                    setReferralMessage("Kode referral tidak ditemukan atau penjual sudah tidak aktif.");
                  }
                } catch {
                  if (referralCodeRef.current === code) {
                    setReferralMessage("Kode referral belum dapat diperiksa. Coba lagi.");
                  }
                }
              }}
            />
          </>
        ) : (
          <>
            <FormFieldLabel htmlFor="seller-name-search" required>Nama atau kode referral penjual</FormFieldLabel>
            <input
              autoComplete="off"
              id="seller-name-search"
              maxLength={80}
              onChange={(event) => {
                setSellerSearch(event.currentTarget.value);
                setSellerMemberId("");
                setSelectedSeller(null);
                setSellerResults([]);
                setSearchingSellers(false);
                setReferralMessage("");
              }}
              placeholder="Ketik minimal 2 karakter"
              value={sellerSearch}
            />
            {sellerResults.length > 0 && (
              <ul className="zas-registration-seller-results">
                {sellerResults.map((seller) => (
                  <li key={seller.id}>
                    <button
                      onClick={() => {
                        setSellerMemberId(seller.id);
                        setSelectedSeller(seller);
                        setSellerSearch(`${seller.fullName} · ${seller.referralCode}`);
                        setSellerResults([]);
                        setSearchingSellers(false);
                        setReferralMessage("");
                      }}
                      type="button"
                    >
                      <strong>{seller.fullName}</strong>
                      <span>{sellerPositionLabel(seller.position)} · {seller.referralCode}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searchingSellers && <p className="zas-registration-ticket-note" role="status">Mencari penjual...</p>}
            {!searchingSellers && sellerSearch.trim().length >= 2 && !sellerResults.length && !selectedSeller && (
              <p className="zas-registration-ticket-note">Tidak ada anggota aktif yang cocok.</p>
            )}
          </>
        )}
        {selectedSeller && (
          <p className="zas-registration-ticket-note" role="status">
            Penjual terpilih: {selectedSeller.fullName} · {sellerPositionLabel(selectedSeller.position)} · {selectedSeller.referralCode}
          </p>
        )}
        {referralMessage && (
          <p className="zas-registration-ticket-note" role="status">{referralMessage}</p>
        )}
      </fieldset>

      <fieldset>
        <legend>About your participation</legend>
        {REGISTRATION_QUESTIONS.map((question) => (
          <div className="zas-registration-question" key={question.key}>
            <label htmlFor={question.key}>{question.label}</label>
            <textarea id={question.key} name={question.key} rows={3} maxLength={1000} />
          </div>
        ))}
      </fieldset>

      <div className="zas-registration-honeypot" aria-hidden="true">
        <label htmlFor="registration-website">Leave this field empty</label>
        <input autoComplete="off" id="registration-website" name="website" tabIndex={-1} />
      </div>

      <p className="zas-registration-privacy" id="registration-privacy-note">
        Your details are used to process this event registration and are not shown in a public participant directory.
      </p>
      <label className="zas-registration-consent" htmlFor="registration-privacy-consent">
        <input
          id="registration-privacy-consent"
          name="agreedToPrivacy"
          type="checkbox"
          required
        />
        <span>I agree to the use of my information to administer this event registration.</span>
      </label>
      <button disabled={pending} type="submit">
        {pending ? "Submitting registration..." : "Register"}
      </button>
    </form>
  );
}
