import type { SalesPosition } from "@/lib/sales/labels";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SalesMemberInput = {
  position: SalesPosition;
  personId: string | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  region: string;
  supervisorMemberId: string | null;
  joinedAt: Date;
  quotaAmount: string;
};

export type SalesMemberValidation =
  | { success: true; data: SalesMemberInput }
  | { success: false; error: string; fieldErrors: Record<string, string> };

function value(formData: FormData, key: string): string {
  const field = formData.get(key);
  return typeof field === "string" ? field.trim() : "";
}

export function validateSalesMember(
  formData: FormData,
): SalesMemberValidation {
  const position = value(formData, "position");
  const personIdValue = value(formData, "personId");
  const personId = personIdValue || null;
  const fullName = value(formData, "fullName");
  const phone = value(formData, "phone");
  const emailValue = value(formData, "email").toLowerCase();
  const region = value(formData, "region");
  const supervisorMemberId = value(formData, "supervisorMemberId");
  const joinedAtValue = value(formData, "joinedAt");
  const quotaAmount = value(formData, "quotaAmount");
  const errors: Record<string, string> = {};

  if (!["director", "arm", "branch_manager", "sales"].includes(position)) {
    errors.position = "Pilih jabatan yang tersedia.";
  }
  if (!personId) {
    if (!fullName || fullName.length > 160) {
      errors.fullName = "Nama wajib diisi dan maksimal 160 karakter.";
    }
    if (
      phone.length > 40 ||
      !/^\+?[\d\s().-]+$/.test(phone) ||
      phone.replace(/\D/g, "").length < 7 ||
      phone.replace(/\D/g, "").length > 20
    ) {
      errors.phone = "Masukkan nomor telepon yang valid.";
    }
    if (
      emailValue &&
      (emailValue.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue))
    ) {
      errors.email = "Masukkan alamat email yang valid.";
    }
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(personId)) {
    errors.personId = "Pilih identitas anggota yang valid.";
  }
  if (!region || region.length > 160) {
    errors.region = "Wilayah wajib diisi dan maksimal 160 karakter.";
  }
  if (
    position === "director" && supervisorMemberId ||
    position !== "director" && !supervisorMemberId
  ) {
    errors.supervisorMemberId = position === "director"
      ? "Direktur Pemasaran tidak memiliki atasan pada struktur penjualan."
      : "Pilih atasan langsung sesuai hierarki.";
  }
  if (supervisorMemberId && !UUID_PATTERN.test(supervisorMemberId)) {
    errors.supervisorMemberId = "Pilih atasan langsung yang valid.";
  }
  const joinedAt = /^\d{4}-\d{2}-\d{2}$/.test(joinedAtValue)
    ? new Date(`${joinedAtValue}T00:00:00.000Z`)
    : new Date(Number.NaN);
  if (Number.isNaN(joinedAt.getTime())) {
    errors.joinedAt = "Masukkan tanggal bergabung yang valid.";
  }
  if (
    !/^\d{1,12}$/.test(quotaAmount) ||
    !Number.isSafeInteger(Number(quotaAmount))
  ) {
    errors.quotaAmount = "Kuota harus berupa jumlah tiket bulat nonnegatif.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      error: "Periksa kembali data anggota yang ditandai.",
      fieldErrors: errors,
    };
  }

  return {
    success: true,
    data: {
      position: position as SalesPosition,
      personId,
      fullName: personId ? null : fullName,
      phone: personId ? null : phone,
      email: personId ? null : emailValue || null,
      region,
      supervisorMemberId: supervisorMemberId || null,
      joinedAt,
      quotaAmount,
    },
  };
}
