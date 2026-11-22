export const EVENT_STATUSES = [
  "draft",
  "published",
  "closed",
  "cancelled",
  "archived",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_PERMISSIONS = {
  read: "events.read",
  create: "events.create",
  update: "events.update",
  publish: "events.publish",
  close: "events.close",
  cancel: "events.cancel",
  archive: "events.archive",
  manageStaff: "events.staff.manage",
  manageTickets: "ticket-types.manage",
  reviewPayments: "payments.review",
  collectInvitations: "invitations.collect",
  recordCheckIns: "checkins.record",
  manageContacts: "contacts.manage",
} as const;

export type EventInput = {
  slug: string;
  eventCode: string;
  name: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
};

export type EventPublishFields = Pick<
  EventInput,
  | "slug"
  | "name"
  | "description"
  | "startsAt"
  | "endsAt"
  | "timezone"
  | "venueName"
  | "venueAddress"
>;

export function buildDraftEventData(input: EventInput, adminUserId: string) {
  return {
    ...input,
    createdByAdminUserId: adminUserId,
    status: "draft" as const,
  };
}

export type TicketTypeInput = {
  code: string;
  name: string;
  description: string | null;
  priceAmount: string;
  currency: string;
  capacity: number | null;
  salesOpensAt: Date | null;
  salesClosesAt: Date | null;
  isActive: boolean;
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export function getMissingEventPublishFields(event: EventPublishFields): string[] {
  const missing: string[] = [];
  if (!event.name.trim()) missing.push("Nama Event");
  if (!event.slug.trim()) missing.push("Slug");
  if (!event.description?.trim()) missing.push("Ringkasan / deskripsi");
  if (!event.startsAt || !Number.isFinite(event.startsAt.getTime())) {
    missing.push("Tanggal dan jam mulai");
  }
  if (!event.endsAt || !Number.isFinite(event.endsAt.getTime())) {
    missing.push("Tanggal dan jam selesai");
  }
  if (!event.timezone.trim()) missing.push("Timezone");
  if (!event.venueName?.trim()) missing.push("Nama venue");
  if (!event.venueAddress?.trim()) missing.push("Alamat venue");
  return missing;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: string, maximumLength: number): string | null {
  if (!value) return null;
  return value.length <= maximumLength ? value : null;
}

function parseIsoDate(value: string, label: string): ValidationResult<Date | null> {
  if (!value) return { success: true, data: null };
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (
    value.length > 40 ||
    !parts
  ) {
    return {
      success: false,
      error: `${label} harus berupa tanggal dan waktu ISO 8601 dengan offset timezone.`,
    };
  }
  const [, year, month, day, hour, minute, second = "0", zone, , offsetHour = "0", offsetMinute = "0"] =
    parts;
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    calendarDate.getUTCFullYear() !== Number(year) ||
    calendarDate.getUTCMonth() !== Number(month) - 1 ||
    calendarDate.getUTCDate() !== Number(day) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (zone !== "Z" && (Number(offsetHour) > 23 || Number(offsetMinute) > 59))
  ) {
    return { success: false, error: `${label} bukan tanggal dan waktu yang valid.` };
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return { success: false, error: `${label} bukan tanggal dan waktu yang valid.` };
  }
  return { success: true, data: date };
}

function validateTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function validateEventForm(formData: FormData): ValidationResult<EventInput> {
  const slug = readString(formData, "slug").toLowerCase();
  const eventCode = readString(formData, "eventCode").toUpperCase();
  const name = readString(formData, "name");
  const descriptionValue = readString(formData, "description");
  const timezone = readString(formData, "timezone");
  const venueNameValue = readString(formData, "venueName");
  const venueAddressValue = readString(formData, "venueAddress");
  const startsAt = parseIsoDate(readString(formData, "startsAt"), "Waktu mulai");
  const endsAt = parseIsoDate(readString(formData, "endsAt"), "Waktu selesai");
  const registrationOpensAt = parseIsoDate(
    readString(formData, "registrationOpensAt"),
    "Pembukaan pendaftaran",
  );
  const registrationClosesAt = parseIsoDate(
    readString(formData, "registrationClosesAt"),
    "Penutupan pendaftaran",
  );

  const fieldErrors: Record<string, string> = {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) {
    fieldErrors.slug = "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung tunggal.";
  }
  if (!/^[A-Z0-9]{2,12}$/.test(eventCode)) {
    fieldErrors.eventCode = "Kode event wajib 2–12 huruf besar atau angka dan harus stabil.";
  }
  if (!name || name.length > 200) {
    fieldErrors.name = "Nama Event wajib diisi dan maksimal 200 karakter.";
  }
  if (descriptionValue.length > 10_000) {
    fieldErrors.description = "Deskripsi maksimal 10.000 karakter.";
  }
  if (!validateTimezone(timezone) || timezone.length > 64) {
    fieldErrors.timezone = "Pilih timezone event yang valid.";
  }
  if (venueNameValue.length > 200) {
    fieldErrors.venueName = "Nama venue maksimal 200 karakter.";
  }
  if (venueAddressValue.length > 10_000) {
    fieldErrors.venueAddress = "Alamat venue maksimal 10.000 karakter.";
  }
  if (!startsAt.success) fieldErrors.startsAt = startsAt.error;
  if (!endsAt.success) fieldErrors.endsAt = endsAt.error;
  if (startsAt.success && !startsAt.data) {
    fieldErrors.startsAt = "Waktu mulai wajib diisi.";
  }
  if (endsAt.success && !endsAt.data) {
    fieldErrors.endsAt = "Waktu selesai wajib diisi.";
  }
  if (!registrationOpensAt.success) {
    fieldErrors.registrationOpensAt = registrationOpensAt.error;
  }
  if (!registrationClosesAt.success) {
    fieldErrors.registrationClosesAt = registrationClosesAt.error;
  }
  if (
    startsAt.success &&
    endsAt.success &&
    startsAt.data &&
    endsAt.data &&
    endsAt.data <= startsAt.data
  ) {
    fieldErrors.endsAt = "Waktu selesai harus setelah waktu mulai.";
  }
  if (
    registrationOpensAt.success &&
    registrationClosesAt.success &&
    registrationOpensAt.data &&
    registrationClosesAt.data &&
    registrationClosesAt.data <= registrationOpensAt.data
  ) {
    fieldErrors.registrationClosesAt =
      "Waktu penutupan pendaftaran harus setelah waktu pembukaan.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: Object.values(fieldErrors)[0],
      fieldErrors,
    };
  }
  if (
    !startsAt.success ||
    !startsAt.data ||
    !endsAt.success ||
    !endsAt.data ||
    !registrationOpensAt.success ||
    !registrationClosesAt.success
  ) {
    return { success: false, error: "Tanggal event tidak valid." };
  }

  return {
    success: true,
    data: {
      slug,
      eventCode,
      name,
      description: descriptionValue || null,
      startsAt: startsAt.data,
      endsAt: endsAt.data,
      timezone,
      venueName: optionalString(venueNameValue, 200),
      venueAddress: optionalString(venueAddressValue, 10_000),
      registrationOpensAt: registrationOpensAt.data,
      registrationClosesAt: registrationClosesAt.data,
    },
  };
}

export function validateTicketTypeForm(
  formData: FormData,
): ValidationResult<TicketTypeInput> {
  const code = readString(formData, "code").toUpperCase();
  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const priceAmount = readString(formData, "priceAmount");
  const currency = readString(formData, "currency").toUpperCase();
  const capacityValue = readString(formData, "capacity");
  const salesOpensAt = parseIsoDate(readString(formData, "salesOpensAt"), "Ticket sales opening");
  const salesClosesAt = parseIsoDate(readString(formData, "salesClosesAt"), "Ticket sales closing");

  const fieldErrors: Record<string, string> = {};
  if (!/^[A-Z0-9_-]{1,80}$/.test(code)) {
    fieldErrors.code =
      "Ticket Code hanya boleh berisi huruf, angka, garis bawah, atau tanda hubung.";
  }
  if (!name || name.length > 160) {
    fieldErrors.name = "Nama tiket wajib diisi dan maksimal 160 karakter.";
  }
  if (description.length > 10_000) {
    fieldErrors.description = "Deskripsi tiket maksimal 10.000 karakter.";
  }
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(priceAmount)) {
    fieldErrors.priceAmount = "Harga harus angka nol atau lebih, maksimal dua angka desimal.";
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    fieldErrors.currency = "Mata uang harus menggunakan kode ISO tiga huruf.";
  }
  let capacity: number | null = null;
  if (capacityValue) {
    if (!/^[1-9]\d*$/.test(capacityValue)) {
      fieldErrors.capacity = "Kapasitas harus berupa bilangan bulat lebih dari nol.";
    } else {
      capacity = Number(capacityValue);
      if (!Number.isSafeInteger(capacity) || capacity > 2_147_483_647) {
        fieldErrors.capacity = "Kapasitas melebihi batas yang didukung.";
      }
    }
  }
  if (!["true", "false", ""].includes(readString(formData, "isActive"))) {
    fieldErrors.isActive = "Pilih status tiket yang valid.";
  }
  if (!salesOpensAt.success) fieldErrors.salesOpensAt = salesOpensAt.error;
  if (!salesClosesAt.success) fieldErrors.salesClosesAt = salesClosesAt.error;
  if (
    salesOpensAt.success &&
    salesClosesAt.success &&
    salesOpensAt.data &&
    salesClosesAt.data &&
    salesClosesAt.data <= salesOpensAt.data
  ) {
    fieldErrors.salesClosesAt = "Penjualan tiket harus ditutup setelah waktu pembukaan.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: Object.values(fieldErrors)[0],
      fieldErrors,
    };
  }
  if (!salesOpensAt.success || !salesClosesAt.success) {
    return { success: false, error: "Jadwal penjualan tiket tidak valid." };
  }

  return {
    success: true,
    data: {
      code,
      name,
      description: description || null,
      priceAmount,
      currency,
      capacity,
      salesOpensAt: salesOpensAt.data,
      salesClosesAt: salesClosesAt.data,
      isActive: readString(formData, "isActive") !== "false",
    },
  };
}

export function isTicketCapacitySufficient(
  capacity: number | null,
  activeRegistrationCount: number,
): boolean {
  return capacity === null || capacity >= activeRegistrationCount;
}

const EVENT_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["closed", "cancelled"],
  closed: ["cancelled", "archived"],
  cancelled: ["archived"],
  archived: [],
};

export function isEventStatus(value: string): value is EventStatus {
  return EVENT_STATUSES.includes(value as EventStatus);
}

export function canTransitionEventStatus(
  current: EventStatus,
  next: EventStatus,
): boolean {
  return EVENT_TRANSITIONS[current].includes(next);
}

export function availableEventTransitions(current: EventStatus): readonly EventStatus[] {
  return EVENT_TRANSITIONS[current];
}

export function permissionForEventTransition(
  next: EventStatus,
): string | null {
  switch (next) {
    case "published":
      return EVENT_PERMISSIONS.publish;
    case "closed":
      return EVENT_PERMISSIONS.close;
    case "cancelled":
      return EVENT_PERMISSIONS.cancel;
    case "archived":
      return EVENT_PERMISSIONS.archive;
    case "draft":
      return null;
  }
}
