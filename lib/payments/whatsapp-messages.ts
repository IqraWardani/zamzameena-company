export type WhatsAppMessageInput = {
  participantName: string;
  invoiceNumber: string;
  ticketName: string;
  eventName: string;
  paymentStatus: "pending" | "paid";
  paymentVerificationPending?: boolean;
};

export function normalizeWhatsAppNumber(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("62")) {
    digits = `62${digits.slice(2)}`;
  } else if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }

  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

export function createWhatsAppMessage(input: WhatsAppMessageInput): string {
  if (input.paymentStatus === "pending") {
    const paymentStatusMessage = input.paymentVerificationPending
      ? "Kami telah menerima bukti pembayaran Anda. Pembayaran masih dalam proses verifikasi."
      : "Mohon melakukan pembayaran sesuai instruksi pada invoice.";
    const proofMessage = input.paymentVerificationPending
      ? "Kami akan menginformasikan hasil verifikasi setelah pemeriksaan selesai."
      : "Jika sudah melakukan transfer, silakan kirimkan bukti pembayaran melalui WhatsApp ini.";

    const opening = input.paymentVerificationPending
      ? `Kami telah menerima bukti pembayaran untuk pendaftaran Anda pada ${input.eventName}. Pembayaran masih menunggu verifikasi admin.`
      : `Kami dari ZAMZAMEENA ingin mengingatkan bahwa pendaftaran Anda untuk ${input.eventName} masih menunggu pembayaran.`;

    return `Halo ${input.participantName},

${opening}

Informasi pendaftaran:

Nomor Invoice: ${input.invoiceNumber}
Jenis Tiket: ${input.ticketName}

${paymentStatusMessage}

${proofMessage}

Terima kasih.

ZAMZAMEENA
${input.eventName}`;
  }

  return `Halo ${input.participantName},

Terima kasih telah melakukan pembayaran untuk ${input.eventName}.

Kami informasikan bahwa pembayaran Anda telah berhasil diverifikasi.

Berikut informasi pendaftaran Anda:

Nama: ${input.participantName}
Nomor Invoice: ${input.invoiceNumber}
Jenis Tiket: ${input.ticketName}
Status Pembayaran: PAID / TERKONFIRMASI

Pendaftaran Anda telah dikonfirmasi.

Sampai bertemu di ${input.eventName}!

Salam,
ZAMZAMEENA`;
}

export function createWhatsAppUrl(phone: string, message: string): string | null {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
