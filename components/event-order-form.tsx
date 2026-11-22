"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { type PublicRegistrationFormState, submitPublicRegistration } from "@/app/events/[eventSlug]/register/actions";
import { FormFieldLabel } from "@/components/form-field-label";
import { PaymentAccountCard } from "@/components/payment-account-card";
import { contactInfo } from "@/lib/contact-info";
import { formatPrice as formatLocalizedPrice } from "@/lib/format-price";
import { SALES_POSITION_LABELS, type SalesPosition } from "@/lib/sales/labels";

type OrderTicket = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceAmount: string;
  currency: string;
};

type ParticipantValues = {
  fullName: string;
  email: string;
  phone: string;
  domicileAddress: string;
  identityAddress: string;
  city: string;
  businessComment: string;
};

type ReferralCandidate = {
  id: string;
  fullName: string;
  position: SalesPosition;
};

type ReferralIdentity = ReferralCandidate & {
  memberId: string;
  referralCode: string;
};

const EMPTY_VALUES: ParticipantValues = {
  fullName: "",
  email: "",
  phone: "",
  domicileAddress: "",
  identityAddress: "",
  city: "",
  businessComment: "",
};

function isSalesPosition(value: unknown): value is SalesPosition {
  return typeof value === "string" && Object.hasOwn(SALES_POSITION_LABELS, value);
}

function isReferralCandidate(value: unknown): value is ReferralCandidate {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string" && "fullName" in value && typeof value.fullName === "string" && "position" in value && isSalesPosition(value.position);
}

function isReferralSearchResponse(value: unknown): value is { members: ReferralCandidate[] } {
  return typeof value === "object" && value !== null && "members" in value && Array.isArray(value.members) && value.members.every(isReferralCandidate);
}

function isReferralIdentity(value: unknown): value is ReferralIdentity {
  return (
    typeof value === "object" &&
    value !== null &&
    "valid" in value &&
    value.valid === true &&
    "memberId" in value &&
    typeof value.memberId === "string" &&
    "referralCode" in value &&
    typeof value.referralCode === "string" &&
    "fullName" in value &&
    typeof value.fullName === "string" &&
    "position" in value &&
    isSalesPosition(value.position)
  );
}

function referralPositionLabel(position: SalesPosition): string {
  return position === "arm" ? `ARM · ${SALES_POSITION_LABELS.arm}` : SALES_POSITION_LABELS[position];
}

function formatPrice(amount: string, currency: string): string {
  return formatLocalizedPrice(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatInvoiceDate(value: string | undefined): string {
  if (!value) return "Diterbitkan setelah order berhasil";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(date);
}

export function EventOrderForm({ eventSlug, eventName, ticket, backHref, initialReferralCode }: { eventSlug: string; eventName: string; ticket: OrderTicket; backHref: string; initialReferralCode: string }) {
  const action = submitPublicRegistration.bind(null, eventSlug);
  const [state, setState] = useState<PublicRegistrationFormState>({});
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [referralMethod, setReferralMethod] = useState<"seller" | "code">(initialReferralCode ? "code" : "seller");
  const [sellerQuery, setSellerQuery] = useState("");
  const [sellerCandidates, setSellerCandidates] = useState<ReferralCandidate[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<ReferralCandidate | null>(null);
  const [sellerSearchPending, setSellerSearchPending] = useState(false);
  const [sellerSearchError, setSellerSearchError] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [validatedReferral, setValidatedReferral] = useState<ReferralIdentity | null>(null);
  const [referralValidationPending, setReferralValidationPending] = useState(Boolean(initialReferralCode));
  const [referralError, setReferralError] = useState("");
  const submissionInProgress = useRef(false);
  const sellerSearchSequence = useRef(0);
  const initialReferralOverridden = useRef(false);
  const price = formatPrice(ticket.priceAmount, ticket.currency);
  const isFree = Number(ticket.priceAmount) === 0;

  useEffect(() => {
    if (!initialReferralCode) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      eventSlug,
      code: initialReferralCode,
    });

    void fetch(`/api/referrals/validate?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok || !isReferralIdentity(result)) {
          if (!initialReferralOverridden.current) {
            setReferralError("Kode referral dari link tidak terdaftar atau pemiliknya tidak aktif untuk event ini.");
          }
          return;
        }
        if (!initialReferralOverridden.current) setValidatedReferral(result);
      })
      .catch(() => {
        if (!controller.signal.aborted && !initialReferralOverridden.current) {
          setReferralError("Kode referral dari link belum dapat divalidasi. Periksa koneksi lalu coba kembali.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setReferralValidationPending(false);
      });

    return () => controller.abort();
  }, [eventSlug, initialReferralCode]);

  function updateValue(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.currentTarget;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function changeReferralMethod(method: "seller" | "code") {
    sellerSearchSequence.current += 1;
    initialReferralOverridden.current = true;
    setReferralMethod(method);
    setSellerQuery("");
    setSellerCandidates([]);
    setSelectedSeller(null);
    setSellerSearchPending(false);
    setSellerSearchError("");
    setReferralCode("");
    setValidatedReferral(null);
    setReferralValidationPending(false);
    setReferralError("");
  }

  async function searchSellers(query: string) {
    setSellerQuery(query);
    setSelectedSeller(null);
    setSellerSearchError("");
    const sequence = ++sellerSearchSequence.current;
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setSellerCandidates([]);
      setSellerSearchPending(false);
      return;
    }

    setSellerSearchPending(true);
    try {
      const params = new URLSearchParams({
        eventSlug,
        q: normalizedQuery,
      });
      const response = await fetch(`/api/referrals/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error("Pencarian anggota referral tidak dapat dilakukan.");
      }
      const result: unknown = await response.json();
      if (!isReferralSearchResponse(result)) {
        throw new Error("Data anggota referral tidak dapat dibaca.");
      }
      if (sequence === sellerSearchSequence.current) {
        setSellerCandidates(result.members);
      }
    } catch {
      if (sequence === sellerSearchSequence.current) {
        setSellerCandidates([]);
        setSellerSearchError("Daftar anggota belum dapat dimuat. Periksa koneksi lalu coba kembali.");
      }
    } finally {
      if (sequence === sellerSearchSequence.current) {
        setSellerSearchPending(false);
      }
    }
  }

  async function validateReferralCode() {
    const normalizedCode = referralCode.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(normalizedCode)) {
      setValidatedReferral(null);
      setReferralError("Masukkan kode referral yang terdiri dari 3–40 huruf, angka, atau tanda hubung.");
      return;
    }

    setReferralValidationPending(true);
    setReferralError("");
    setValidatedReferral(null);
    try {
      const params = new URLSearchParams({ eventSlug, code: normalizedCode });
      const response = await fetch(`/api/referrals/validate?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      const result: unknown = await response.json();
      if (!response.ok || !isReferralIdentity(result)) {
        setReferralError("Kode referral tidak terdaftar atau pemiliknya tidak aktif untuk event ini. Periksa kembali kodenya.");
        return;
      }
      setValidatedReferral(result);
    } catch {
      setReferralError("Kode referral belum dapat divalidasi. Periksa koneksi lalu coba kembali.");
    } finally {
      setReferralValidationPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current) return;
    if (referralMethod === "seller" && !selectedSeller) {
      setReferralError("Pilih nama penjual aktif yang mereferensikan Anda.");
      return;
    }
    if (referralMethod === "code" && (!validatedReferral || validatedReferral.referralCode.toUpperCase() !== referralCode.trim().toUpperCase())) {
      setReferralError("Gunakan kode referral yang valid sebelum melanjutkan.");
      return;
    }
    submissionInProgress.current = true;
    setPending(true);
    try {
      const result = await action(state, new FormData(event.currentTarget));
      setState(result);
    } catch {
      setState({
        error: "Koneksi terputus sebelum order terkonfirmasi. Data Anda tetap tersedia; periksa koneksi lalu coba kembali.",
      });
    } finally {
      submissionInProgress.current = false;
      setPending(false);
    }
  }

  return (
    <div className="zas-event-order-layout">
      <div className="zas-event-order-participant-column">
        <section aria-labelledby="order-form-heading" className="zas-event-order-form-card">
          <p className="zas-event-eyebrow">DATA PESERTA</p>
          <h2 id="order-form-heading">{state.registrationNumber ? "Order berhasil dibuat" : "Lengkapi informasi"}</h2>
          {state.registrationNumber ? (
            <div className="zas-event-order-success" role="status" aria-live="polite">
              <p>Nomor registrasi</p>
              <strong>{state.registrationNumber}</strong>
              {state.invoiceNumber && (
                <>
                  <p>Nomor invoice</p>
                  <strong>{state.invoiceNumber}</strong>
                  {state.emailNotice && <p className="zas-event-order-warning">{state.emailNotice}</p>}
                  {state.emailSent && <p>Email invoice berhasil dikirim ke alamat yang didaftarkan.</p>}
                  <div className="zas-event-order-actions">
                    {state.invoiceId && (
                      <a className="zas-event-button" href={`/participant/invoices/${state.invoiceId}/download`}>
                        Download Invoice <span aria-hidden="true">↓</span>
                      </a>
                    )}
                    <a
                      className="zas-event-order-whatsapp"
                      href={`${contactInfo.socials.whatsapp}?text=${encodeURIComponent(`Halo Admin ZAS, saya ${values.fullName}. Saya sudah melakukan pemesanan ${ticket.name} untuk ${eventName}. Nomor invoice ${state.invoiceNumber}. Saya akan mengirim bukti transfer melalui WhatsApp ini untuk verifikasi manual.`)}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Kirim Bukti Transfer
                    </a>
                  </div>
                </>
              )}
              {!state.invoiceNumber && <p>Tiket gratis dikonfirmasi tanpa invoice atau pembayaran.</p>}
              <p>Status pembayaran hanya dapat berubah menjadi PAID setelah verifikasi manual oleh admin.</p>
            </div>
          ) : (
            <>
              <p className="zas-event-order-disclaimer">Invoice bernomor unik dibuat oleh server setelah order berhasil. Nomor invoice tidak dapat dipilih atau diubah oleh peserta.</p>
              <form className="zas-event-order-form" onSubmit={handleSubmit}>
                {state.error && (
                  <p className="zas-event-form-error" role="alert">
                    {state.error}
                  </p>
                )}
                <input name="ticketTypeId" type="hidden" value={ticket.id} />
                <div className="zas-event-form-field">
                  <FormFieldLabel htmlFor="event-order-name" required>
                    Nama lengkap
                  </FormFieldLabel>
                  <input autoComplete="name" id="event-order-name" maxLength={160} name="fullName" onChange={updateValue} required value={values.fullName} />
                </div>
                <div className="zas-event-form-field">
                  <FormFieldLabel htmlFor="event-order-email" required>
                    Email
                  </FormFieldLabel>
                  <input autoComplete="email" id="event-order-email" maxLength={320} name="email" onChange={updateValue} required type="email" value={values.email} />
                </div>
                <div className="zas-event-form-field">
                  <FormFieldLabel htmlFor="event-order-phone" required>
                    Nomor telepon
                  </FormFieldLabel>
                  <input autoComplete="tel" id="event-order-phone" maxLength={40} name="phone" onChange={updateValue} required type="tel" value={values.phone} />
                </div>
                <div className="zas-event-form-field">
                  <label htmlFor="event-order-domicile-address">Alamat Domisili</label>
                  <input autoComplete="street-address" id="event-order-domicile-address" maxLength={2000} name="domicileAddress" onChange={updateValue} placeholder="Masukkan alamat domisili saat ini." value={values.domicileAddress} />
                </div>
                <div className="zas-event-form-field">
                  <label htmlFor="event-order-identity-address">Alamat Tempat Tinggal (sesuai KTP)</label>
                  <input autoComplete="street-address" id="event-order-identity-address" maxLength={2000} name="identityAddress" onChange={updateValue} placeholder="Masukkan alamat lengkap sesuai KTP." value={values.identityAddress} />
                </div>
                <div className="zas-event-form-field">
                  <label htmlFor="event-order-city">Kota</label>
                  <input autoComplete="address-level2" id="event-order-city" maxLength={120} name="city" onChange={updateValue} value={values.city} />
                </div>
                <section aria-labelledby="event-order-referral-heading" className="zas-event-referral-section">
                  <div className="zas-event-referral-heading">
                    <h3 id="event-order-referral-heading">Informasi Referral</h3>
                    <p>Pilih salah satu cara untuk mengidentifikasi penjual yang mereferensikan Anda.</p>
                  </div>
                  <div aria-label="Metode referral" className="zas-event-referral-methods">
                    <button aria-pressed={referralMethod === "seller"} className={referralMethod === "seller" ? "is-selected" : ""} onClick={() => changeReferralMethod("seller")} type="button">
                      Pilih Nama Penjual
                    </button>
                    <button aria-pressed={referralMethod === "code"} className={referralMethod === "code" ? "is-selected" : ""} onClick={() => changeReferralMethod("code")} type="button">
                      Gunakan Kode Referral
                    </button>
                  </div>
                  {referralMethod === "seller" ? (
                    <div className="zas-event-referral-panel">
                      <label htmlFor="event-order-seller-search">Cari nama penjual</label>
                      <input autoComplete="off" id="event-order-seller-search" maxLength={80} onChange={(event) => void searchSellers(event.currentTarget.value)} placeholder="Ketik minimal 2 karakter nama penjual" value={sellerQuery} />
                      {sellerSearchPending && (
                        <p className="zas-event-referral-feedback" role="status">
                          Mencari anggota aktif...
                        </p>
                      )}
                      {sellerSearchError && (
                        <p className="zas-event-referral-error" role="alert">
                          {sellerSearchError}
                        </p>
                      )}
                      {sellerCandidates.length > 0 && !selectedSeller && (
                        <ul aria-label="Daftar anggota aktif" className="zas-event-referral-options">
                          {sellerCandidates.map((member) => (
                            <li key={member.id}>
                              <button
                                onClick={() => {
                                  sellerSearchSequence.current += 1;
                                  setSelectedSeller(member);
                                  setSellerCandidates([]);
                                  setReferralError("");
                                }}
                                type="button"
                              >
                                <strong>{member.fullName}</strong>
                                <span>{referralPositionLabel(member.position)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {!sellerSearchPending && !sellerSearchError && sellerQuery.trim().length >= 2 && sellerCandidates.length === 0 && !selectedSeller && (
                        <p className="zas-event-referral-feedback">Tidak ditemukan anggota aktif yang dapat menerima referral.</p>
                      )}
                      {selectedSeller && (
                        <p className="zas-event-referral-confirmation" role="status">
                          <strong>{selectedSeller.fullName}</strong>
                          <span>{referralPositionLabel(selectedSeller.position)}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="zas-event-referral-panel">
                      <label htmlFor="event-order-referral-code">Kode referral</label>
                      <div className="zas-event-referral-code-row">
                        <input
                          autoComplete="off"
                          id="event-order-referral-code"
                          maxLength={40}
                          onChange={(event) => {
                            initialReferralOverridden.current = true;
                            setReferralCode(event.currentTarget.value);
                            setValidatedReferral(null);
                            setReferralValidationPending(false);
                            setReferralError("");
                          }}
                          placeholder="Contoh: ARM-SPS-001"
                          value={referralCode}
                        />
                        <button className="zas-event-referral-use" disabled={referralValidationPending} onClick={() => void validateReferralCode()} type="button">
                          {referralValidationPending ? "Memeriksa..." : "Gunakan"}
                        </button>
                      </div>
                      {validatedReferral && (
                        <p className="zas-event-referral-confirmation" role="status">
                          <strong>Kode valid · {validatedReferral.fullName}</strong>
                          <span>
                            {referralPositionLabel(validatedReferral.position)} · {validatedReferral.referralCode}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                  {referralError && (
                    <p className="zas-event-referral-error" role="alert">
                      {referralError}
                    </p>
                  )}
                  <p className="zas-event-referral-note">Referral diperlukan untuk pemesanan saat ini. Pilih nama penjual atau gunakan satu kode referral.</p>
                </section>
                {referralMethod === "seller" && <input name="salesMemberId" type="hidden" value={selectedSeller?.id ?? ""} />}
                {referralMethod === "code" && <input name="referralCode" type="hidden" value={referralCode} />}
                <div className="zas-event-form-field zas-event-form-business-comment">
                  <label htmlFor="event-order-business-comment">Komentar tentang Bisnis</label>
                  <p id="event-order-business-comment-description">Bagikan informasi singkat tentang bisnis Anda atau pendapat, masukan, dan ketertarikan Anda terhadap bisnis Zamzameena.</p>
                  <textarea
                    aria-describedby="event-order-business-comment-description"
                    id="event-order-business-comment"
                    maxLength={2000}
                    name="businessComment"
                    onChange={updateValue}
                    placeholder="Ceritakan tentang bisnis Anda, bidang usaha, peluang kolaborasi, atau pendapat Anda tentang Zamzameena..."
                    rows={4}
                    value={values.businessComment}
                  />
                </div>
                <div className="zas-registration-honeypot" aria-hidden="true">
                  <label htmlFor="event-order-website">Leave this field empty</label>
                  <input autoComplete="off" id="event-order-website" name="website" tabIndex={-1} />
                </div>
                <p className="zas-event-privacy-note">Data digunakan untuk mengelola order dan pencocokan identitas saat acara. Peserta cukup membawa KTP asli saat hadir.</p>
                <label className="zas-event-order-consent" htmlFor="event-order-consent">
                  <input checked={agreedToPrivacy} id="event-order-consent" name="agreedToPrivacy" onChange={(event) => setAgreedToPrivacy(event.currentTarget.checked)} required type="checkbox" />
                  <span>Saya menyetujui penggunaan data untuk administrasi pendaftaran event.</span>
                </label>
                <button className="zas-event-button" disabled={pending} type="submit">
                  {pending ? "Memproses order..." : "Order Tiket"}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>

              <div className="zas-event-order-flow">
                <p className="zas-event-eyebrow">ALUR PEMBAYARAN</p>
                <ol>
                  {["Order tiket dan terima invoice", "Transfer sesuai invoice", "Kirim bukti transfer via WhatsApp resmi", "Verifikasi pembayaran oleh admin", "Status PAID setelah disetujui admin", "Ambil undangan fisik saat acara"].map(
                    (step) => (
                      <li key={step}>{step}</li>
                    ),
                  )}
                </ol>
              </div>
              {!isFree && (
                <p className="zas-event-privacy-note">
                  Bukti transfer dikirim melalui WhatsApp resmi admin. Tidak perlu mengirim foto KTP; peserta cukup membawa KTP asli saat menghadiri acara. Status PAID hanya diberikan setelah verifikasi manual admin.
                </p>
              )}
            </>
          )}
        </section>
        <PaymentAccountCard />
      </div>

      <aside aria-label="Preview invoice" className="zas-event-order-summary zas-invoice-preview">
        <div className="zas-invoice-preview-header">
          <p className="zas-invoice-brand">ZAMZAMEENA AINSA SYNERGY</p>
          <h2>INVOICE</h2>
        </div>
        <div className="zas-invoice-number">
          <span>Invoice Number</span>
          <strong>{state.invoiceNumber ?? "Dibuat setelah order berhasil"}</strong>
        </div>
        <dl className="zas-invoice-details">
          <div>
            <dt>Issue Date</dt>
            <dd>{formatInvoiceDate(state.invoicePreview?.issuedAt)}</dd>
          </div>
          <div>
            <dt>Nama peserta</dt>
            <dd>{(state.invoicePreview?.participantName ?? values.fullName) || "Menunggu data peserta"}</dd>
          </div>
          <div>
            <dt>Email peserta</dt>
            <dd>{(state.invoicePreview?.participantEmail ?? values.email) || "Menunggu data peserta"}</dd>
          </div>
          <div>
            <dt>Nama event</dt>
            <dd>{state.invoicePreview?.eventName ?? eventName}</dd>
          </div>
          <div>
            <dt>Jenis tiket</dt>
            <dd>{state.invoicePreview?.ticketName ?? ticket.name}</dd>
          </div>
          {state.registrationNumber && (
            <div>
              <dt>Nomor registrasi</dt>
              <dd>{state.registrationNumber}</dd>
            </div>
          )}
        </dl>
        <div className="zas-invoice-amount">
          <span>Harga tiket · 1</span>
          <strong>{state.invoicePreview ? formatPrice(state.invoicePreview.amountDue, state.invoicePreview.currency) : price}</strong>
        </div>
        <div className="zas-invoice-total">
          <span>Total pembayaran</span>
          <strong>{state.invoicePreview ? formatPrice(state.invoicePreview.amountDue, state.invoicePreview.currency) : price}</strong>
        </div>
        <div className="zas-invoice-payment-status">
          <span>Status pembayaran</span>
          <strong className={state.invoicePreview?.status === "paid" ? "is-paid" : ""}>{state.invoicePreview?.status === "paid" ? "PAID" : state.invoiceNumber ? "UNPAID" : "Belum diterbitkan"}</strong>
        </div>
        {state.invoiceId && (
          <a className="zas-invoice-download" href={`/participant/invoices/${state.invoiceId}/download`}>
            Unduh Invoice PDF <span aria-hidden="true">↓</span>
          </a>
        )}
        {!state.invoiceId && <p className="zas-invoice-note">Pratinjau ini mengikuti data form. Invoice resmi dan nomor invoice diterbitkan oleh backend setelah order berhasil.</p>}
        <a className="zas-invoice-back-link" href={backHref}>
          Kembali ke tiket
        </a>
      </aside>
    </div>
  );
}
