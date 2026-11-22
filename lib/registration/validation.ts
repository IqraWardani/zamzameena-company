export const REGISTRATION_QUESTIONS = [
  {
    key: "event_goals",
    label: "What do you hope to learn or achieve at this event?",
    required: false,
  },
  {
    key: "accessibility_needs",
    label: "Do you have any accessibility or dietary needs?",
    required: false,
  },
] as const;

export const REGISTRATION_DETAIL_ANSWER_KEYS = [
  "domicile_address",
  "identity_address",
  "business_comment",
] as const;

export type ParticipantRegistrationInput = {
  fullName: string;
  email: string;
  phone: string;
  organizationName: string | null;
  jobTitle: string | null;
  city: string | null;
  countryCode: string | null;
  ticketTypeId: string;
  referralCode: string | null;
  salesMemberId: string | null;
  agreedToPrivacy: true;
  answers: { fieldKey: string; answer: string }[];
};

export type RegistrationValidation =
  | { success: true; data: ParticipantRegistrationInput }
  | { success: false; error: string };

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalValue(value: string, maximumLength: number): string | null {
  if (!value) return null;
  return value.length <= maximumLength ? value : null;
}

export function validateParticipantRegistration(
  formData: FormData,
): RegistrationValidation {
  if (readString(formData, "website")) {
    return { success: false, error: "Pemesanan tidak dapat diproses. Silakan coba kembali." };
  }

  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email").toLowerCase();
  const phone = readString(formData, "phone");
  const organizationName = readString(formData, "organizationName");
  const jobTitle = readString(formData, "jobTitle");
  const city = readString(formData, "city");
  const countryCode = readString(formData, "countryCode").toUpperCase();
  const ticketTypeId = readString(formData, "ticketTypeId");
  const referralCode = readString(formData, "referralCode").toUpperCase();
  const salesMemberIdValue = readString(formData, "salesMemberId");
  const agreedToPrivacy = formData.get("agreedToPrivacy") === "on";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = phone.replace(/\D/g, "");
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!fullName || fullName.length > 160) {
    return { success: false, error: "Masukkan nama lengkap (maksimal 160 karakter)." };
  }
  if (email.length > 320 || !emailPattern.test(email)) {
    return { success: false, error: "Masukkan alamat email yang valid." };
  }
  if (
    phone.length > 40 ||
    !/^\+?[\d\s().-]+$/.test(phone) ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 20
  ) {
    return { success: false, error: "Masukkan nomor telepon yang valid, termasuk kode negara." };
  }
  if (organizationName.length > 200 || jobTitle.length > 160 || city.length > 120) {
    return { success: false, error: "Satu atau beberapa isian melebihi batas karakter." };
  }
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    return { success: false, error: "Kode negara harus terdiri dari dua huruf." };
  }
  if (!uuidPattern.test(ticketTypeId)) {
    return { success: false, error: "Pilih jenis tiket yang tersedia." };
  }
  if (
    referralCode.length > 40 ||
    (referralCode !== "" && !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(referralCode))
  ) {
    return { success: false, error: "Kode referral tidak valid." };
  }
  if (
    salesMemberIdValue &&
    !uuidPattern.test(salesMemberIdValue)
  ) {
    return { success: false, error: "Penjual yang dipilih tidak valid." };
  }
  if (referralCode && salesMemberIdValue) {
    return {
      success: false,
      error: "Gunakan hanya satu metode referral: pilih nama penjual atau masukkan kode referral.",
    };
  }
  if (!referralCode && !salesMemberIdValue) {
    return { success: false, error: "Pilih atau masukkan kode referral penjual untuk melanjutkan." };
  }
  if (!agreedToPrivacy) {
    return {
      success: false,
      error: "Setujui penggunaan data untuk administrasi pendaftaran event.",
    };
  }

  const answers: ParticipantRegistrationInput["answers"] = [];
  for (const question of REGISTRATION_QUESTIONS) {
    const answer = readString(formData, question.key);
    if (answer.length > 1000) {
      return {
        success: false,
        error: "Jawaban event maksimal 1.000 karakter.",
      };
    }
    if (answer) answers.push({ fieldKey: question.key, answer });
  }
  for (const [formKey, fieldKey] of [
    ["domicileAddress", "domicile_address"],
    ["identityAddress", "identity_address"],
    ["businessComment", "business_comment"],
  ] as const) {
    const answer = readString(formData, formKey);
    if (answer.length > 2000) {
      return {
        success: false,
        error: "Alamat dan komentar maksimal 2.000 karakter.",
      };
    }
    if (answer) answers.push({ fieldKey, answer });
  }

  return {
    success: true,
    data: {
      fullName,
      email,
      phone,
      organizationName: optionalValue(organizationName, 200),
      jobTitle: optionalValue(jobTitle, 160),
      city: optionalValue(city, 120),
      countryCode: countryCode || null,
      ticketTypeId,
      referralCode: referralCode || null,
      salesMemberId: salesMemberIdValue || null,
      agreedToPrivacy: true,
      answers,
    },
  };
}
