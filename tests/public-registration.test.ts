import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  registerParticipant,
  registrationConfirmationForClient,
  type RegistrationRepository,
  type RegistrationTransaction,
} from "../lib/registration/registration-service";
import { validateParticipantRegistration } from "../lib/registration/validation";
import {
  createInvoiceNumber,
  getEventYear,
} from "../lib/registration/invoice-number";

const NOW = new Date("2026-11-15T07:00:00.000Z");
const EVENT_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_EVENT_ID = "00000000-0000-4000-8000-000000000002";
const TICKET_ID = "00000000-0000-4000-8000-000000000003";
const OTHER_TICKET_ID = "00000000-0000-4000-8000-000000000004";
const SELLER_ID = "00000000-0000-4000-8000-000000000005";

function registrationForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    fullName: "Ada Lovelace",
    email: "ADA@example.com",
    phone: "+62 812-3456-7890",
    ticketTypeId: TICKET_ID,
    referralCode: "ARM-IQRA",
    agreedToPrivacy: "on",
    event_goals: "Learn and collaborate",
    accessibility_needs: "",
    ...overrides,
  })) {
    form.set(key, value);
  }
  return form;
}

function validInput() {
  const validation = validateParticipantRegistration(registrationForm());
  if (!validation.success) throw new Error("The shared registration form fixture is invalid.");
  return validation.data;
}

class MemoryRegistrationRepository implements RegistrationRepository {
  event = {
    id: EVENT_ID,
    slug: "synergy-preneur-summit-2027",
    name: "ZAS Summit",
    status: "published",
    startsAt: new Date("2027-01-15T02:00:00.000Z"),
    timezone: "Asia/Makassar",
    registrationOpensAt: null,
    registrationClosesAt: null,
  };
  ticket = {
    id: TICKET_ID,
    eventId: EVENT_ID,
    priceAmount: "125000.00",
    currency: "IDR",
    isActive: true,
    capacity: 100,
    salesOpensAt: null,
    salesClosesAt: null,
  };
  participants = new Map<
    string,
    { id: string; organizationName?: string | null; jobTitle?: string | null }
  >();
  registrations = new Map<
    string,
    {
      registrationNumber: string;
      eventId: string;
      participantId: string;
      ticketId: string;
      sellerMemberId: string | null;
      referralCodeSnapshot: string | null;
      status: string;
    }
  >();
  answers: Array<{ registrationId: string; fieldKey: string; answer: string }> = [];
  createdParticipantProfiles: Array<{
    email: string;
    organizationName: string | null;
    jobTitle: string | null;
  }> = [];
  invoices: Array<{
    registrationId: string;
    invoiceNumber: string;
    unitPriceAmount: string;
    quantity: number;
    subtotalAmount: string;
    discountAmount: string;
    amountDue: string;
    currency: string;
  }> = [];
  invoiceNotifications: Array<{ invoiceId: string; registrationId: string; recipient: string }> = [];
  issuedTickets: string[] = [];
  privacyConsents = new Set<string>();
  nextId = 0;
  nextInvoiceSequenceValue = BigInt(0);
  activeReferral: {
    id: string;
    referralCode: string;
    position: "director" | "arm" | "branch_manager" | "sales";
  } | null = {
    id: SELLER_ID,
    referralCode: "ARM-IQRA",
    position: "arm",
  };

  transaction<T>(work: (transaction: RegistrationTransaction) => Promise<T>): Promise<T> {
    const transaction: RegistrationTransaction = {
      lockParticipantEmail: async () => {},
      nextInvoiceSequence: async () => ++this.nextInvoiceSequenceValue,
      findEventBySlug: async (slug) => (slug === "zas-summit" ? this.event : null),
      lockEventAvailability: async () => {},
      findTicketType: async (id) => (id === this.ticket.id ? this.ticket : null),
      findActiveSalesMemberByReferralCode: async (_eventId, referralCode) =>
        this.activeReferral?.referralCode.toUpperCase() === referralCode
          ? this.activeReferral
          : null,
      findActiveSalesMemberById: async (_eventId, salesMemberId) =>
        this.activeReferral?.id === salesMemberId ? this.activeReferral : null,
      lockTicketCapacity: async () => {},
      findParticipantByEmail: async (email) => this.participants.get(email) ?? null,
      findRegistration: async (eventId, participantProfileId) =>
        [...this.registrations.values()].find(
          (registration) =>
            registration.eventId === eventId &&
            registration.participantId === participantProfileId,
        ) ?? null,
      countCapacityReservations: async (ticketTypeId) =>
        [...this.registrations.values()].filter(
          (registration) => registration.ticketId === ticketTypeId,
        ).length,
      createParticipantProfile: async (profile) => {
        const participant = {
          id: `participant-${++this.nextId}`,
          organizationName: profile.organizationName,
          jobTitle: profile.jobTitle,
        };
        this.createdParticipantProfiles.push({
          email: profile.email,
          organizationName: profile.organizationName,
          jobTitle: profile.jobTitle,
        });
        this.participants.set(profile.email, participant);
        return participant;
      },
      capturePrivacyConsent: async (participantProfileId) => {
        this.privacyConsents.add(participantProfileId);
      },
      createRegistration: async (registration) => {
        const id = `registration-${++this.nextId}`;
        this.registrations.set(id, {
          registrationNumber: registration.registrationNumber,
          eventId: registration.eventId,
          participantId: registration.participantProfileId,
          ticketId: registration.ticketTypeId,
          sellerMemberId: registration.sellerMemberId,
          referralCodeSnapshot: registration.referralCodeSnapshot,
          status: registration.status,
        });
        return { id };
      },
      issueFreeTicket: async (registrationId) => {
        const registration = [...this.registrations.entries()].find(([id]) => id === registrationId);
        if (!registration || registration[1].status !== "confirmed") {
          throw new Error("Cannot issue a free ticket before confirmation.");
        }
        this.issuedTickets.push(registrationId);
      },
      createInvoice: async (invoice) => {
        this.invoices.push(invoice);
        return { id: `invoice-${++this.nextId}` };
      },
      queueInvoiceEmail: async (notification) => {
        this.invoiceNotifications.push({
          invoiceId: notification.invoiceId,
          registrationId: notification.registrationId,
          recipient: notification.recipient,
        });
        return { id: `notification-${++this.nextId}` };
      },
      createAnswers: async (registrationId, answers) => {
        this.answers.push(
          ...answers.map(({ fieldKey, answer }) => ({ registrationId, fieldKey, answer })),
        );
      },
    };
    return work(transaction);
  }
}

test("valid participant registration creates one profile, registration, and answer snapshot", async () => {
  const repository = new MemoryRegistrationRepository();
  const result = await registerParticipant(repository, "zas-summit", validInput(), {
    now: NOW,
    registrationNumber: () => "ZAS-2026-UNIQUE001",
  });

  test("a zero-price registration is confirmed and receives one ticket without a payment invoice", async () => {
    const repository = new MemoryRegistrationRepository();
    repository.ticket = { ...repository.ticket, priceAmount: "0.00" };
    const result = await registerParticipant(repository, "zas-summit", validInput(), {
      now: NOW,
      registrationNumber: () => "ZAS-2026-FREE00001",
    });

    assert.equal(result.success, true);
    assert.deepEqual(repository.issuedTickets, ["registration-2"]);
    assert.equal(repository.registrations.get("registration-2")?.status, "confirmed");
    assert.equal(repository.invoices.length, 0);
  });

  assert.deepEqual(result, {
    success: true,
    registrationNumber: "ZAS-2026-UNIQUE001",
    invoiceNumber: "ZAS-2027-0001",
    invoiceId: "invoice-3",
    invoiceNotificationId: "notification-4",
    registrationId: "registration-2",
    participantProfileId: "participant-1",
  });
  assert.equal(repository.participants.size, 1);
  assert.equal(repository.privacyConsents.size, 1);
  assert.equal(repository.registrations.size, 1);
  assert.deepEqual(repository.invoices, [{
    invoiceNumber: "ZAS-2027-0001",
    registrationId: "registration-2",
    unitPriceAmount: "125000.00",
    quantity: 1,
    subtotalAmount: "125000.00",
    discountAmount: "0.00",
    amountDue: "125000.00",
    currency: "IDR",
  }]);
  assert.deepEqual(repository.invoiceNotifications, [{
    invoiceId: "invoice-3",
    registrationId: "registration-2",
    recipient: "ada@example.com",
  }]);
  assert.deepEqual(repository.answers.map(({ fieldKey, answer }) => ({ fieldKey, answer })), [
    { fieldKey: "event_goals", answer: "Learn and collaborate" },
  ]);
});

test("referral codes are validated before creating participant or registration records", async () => {
  const repository = new MemoryRegistrationRepository();
  const input = validateParticipantRegistration(
    registrationForm({ referralCode: "NOTFOUND" }),
  );
  if (!input.success) throw new Error(input.error);
  const result = await registerParticipant(repository, "zas-summit", input.data, {
    now: NOW,
  });

  assert.deepEqual(result, {
    success: false,
    reason: "invalid_referral",
    error: "Pilih penjual aktif yang terdaftar pada event ini atau masukkan kode referral yang valid.",
  });
  assert.equal(repository.createdParticipantProfiles.length, 0);
  assert.equal(repository.registrations.size, 0);
});

test("registrations without a referral are rejected during input validation", () => {
  const validation = validateParticipantRegistration(
    registrationForm({ referralCode: "" }),
  );
  assert.equal(validation.success, false);
});

test("active referral attribution and invoice price snapshots are saved at order creation", async () => {
  const repository = new MemoryRegistrationRepository();
  repository.activeReferral = {
    id: SELLER_ID,
    referralCode: "ARM-IQRA",
    position: "arm",
  };
  const input = validateParticipantRegistration(
    registrationForm({ referralCode: "arm-iqra" }),
  );
  if (!input.success) throw new Error(input.error);
  await registerParticipant(repository, "zas-summit", input.data, { now: NOW });

  const registration = [...repository.registrations.values()][0];
  assert.equal(registration.sellerMemberId, SELLER_ID);
  assert.equal(registration.referralCodeSnapshot, "ARM-IQRA");
  assert.deepEqual(
    {
      unitPriceAmount: repository.invoices[0]?.unitPriceAmount,
      quantity: repository.invoices[0]?.quantity,
      subtotalAmount: repository.invoices[0]?.subtotalAmount,
      discountAmount: repository.invoices[0]?.discountAmount,
      amountDue: repository.invoices[0]?.amountDue,
    },
    {
      unitPriceAmount: "125000.00",
      quantity: 1,
      subtotalAmount: "125000.00",
      discountAmount: "0.00",
      amountDue: "125000.00",
    },
  );
});

test("a selected seller ID resolves to the same event membership and referral snapshot", async () => {
  const repository = new MemoryRegistrationRepository();
  const input = validateParticipantRegistration(registrationForm({
    referralCode: "",
    salesMemberId: SELLER_ID,
  }));
  if (!input.success) throw new Error(input.error);
  const result = await registerParticipant(repository, "zas-summit", input.data, {
    now: NOW,
  });

  assert.equal(result.success, true);
  const registration = [...repository.registrations.values()][0];
  assert.equal(registration.sellerMemberId, SELLER_ID);
  assert.equal(registration.referralCodeSnapshot, "ARM-IQRA");
});

test("referral code and seller selection cannot be submitted together", () => {
  const validation = validateParticipantRegistration(registrationForm({
    referralCode: "ARM-OTHER",
    salesMemberId: SELLER_ID,
  }));
  assert.deepEqual(validation, {
    success: false,
    error: "Gunakan hanya satu metode referral: pilih nama penjual atau masukkan kode referral.",
  });
});

test("registration service rejects both referral methods even if called without form validation", async () => {
  const repository = new MemoryRegistrationRepository();
  const input = validInput();
  const result = await registerParticipant(
    repository,
    "zas-summit",
    { ...input, salesMemberId: SELLER_ID },
    { now: NOW },
  );

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "invalid_referral");
  assert.equal(repository.createdParticipantProfiles.length, 0);
});

test("privacy consent is captured once per participant profile across registrations", async () => {
  const repository = new MemoryRegistrationRepository();
  await registerParticipant(repository, "zas-summit", validInput(), {
    now: NOW,
    registrationNumber: () => "ZAS-2026-CONSENT01",
  });

  test("event order addresses and optional business comment are validated and saved as registration answers", async () => {
    const form = registrationForm({
      domicileAddress: "Jl. Merdeka No. 10, Makassar",
      identityAddress: "Jl. KTP No. 20, Makassar",
      businessComment: "Usaha kuliner, tertarik berkolaborasi.",
    });
    const validation = validateParticipantRegistration(form);
    if (!validation.success) throw new Error(validation.error);

    const repository = new MemoryRegistrationRepository();
    await registerParticipant(repository, "zas-summit", validation.data, {
      now: NOW,
      registrationNumber: () => "ZAS-2026-ADDRESSES01",
    });

    assert.deepEqual(
      repository.answers.map(({ fieldKey, answer }) => ({ fieldKey, answer })),
      [
        { fieldKey: "event_goals", answer: "Learn and collaborate" },
        { fieldKey: "domicile_address", answer: "Jl. Merdeka No. 10, Makassar" },
        { fieldKey: "identity_address", answer: "Jl. KTP No. 20, Makassar" },
        {
          fieldKey: "business_comment",
          answer: "Usaha kuliner, tertarik berkolaborasi.",
        },
      ],
    );
  });

  test("event order registration succeeds without an optional business comment", async () => {
    const form = registrationForm({
      domicileAddress: "Alamat domisili",
      identityAddress: "Alamat sesuai KTP",
    });
    const validation = validateParticipantRegistration(form);
    if (!validation.success) throw new Error(validation.error);
    assert.equal(
      validation.data.answers.some(({ fieldKey }) => fieldKey === "business_comment"),
      false,
    );

    const result = await registerParticipant(
      new MemoryRegistrationRepository(),
      "zas-summit",
      validation.data,
      { now: NOW, registrationNumber: () => "ZAS-2026-NOCOMMENT01" },
    );
    assert.equal(result.success, true);
  });

  test("new event addresses do not overwrite existing organization and job-title profile data", async () => {
    const repository = new MemoryRegistrationRepository();
    const existingProfile = {
      id: "participant-existing",
      organizationName: "Organisasi lama",
      jobTitle: "Jabatan lama",
    };
    repository.participants.set("ada@example.com", existingProfile);
    const validation = validateParticipantRegistration(
      registrationForm({
        domicileAddress: "Alamat domisili baru",
        identityAddress: "Alamat KTP baru",
        businessComment: "Komentar baru",
      }),
    );
    if (!validation.success) throw new Error(validation.error);

    const result = await registerParticipant(
      repository,
      "zas-summit",
      validation.data,
      { now: NOW, registrationNumber: () => "ZAS-2026-LEGACYSAFE01" },
    );

    assert.equal(result.success, true);
    assert.equal(repository.createdParticipantProfiles.length, 0);
    assert.deepEqual(repository.participants.get("ada@example.com"), existingProfile);
    assert.deepEqual(
      repository.answers.map(({ fieldKey, answer }) => ({ fieldKey, answer })),
      [
        { fieldKey: "event_goals", answer: "Learn and collaborate" },
        { fieldKey: "domicile_address", answer: "Alamat domisili baru" },
        { fieldKey: "identity_address", answer: "Alamat KTP baru" },
        { fieldKey: "business_comment", answer: "Komentar baru" },
      ],
    );
  });
  repository.event = { ...repository.event, id: OTHER_EVENT_ID };
  repository.ticket = { ...repository.ticket, eventId: OTHER_EVENT_ID };
  const secondEvent = await registerParticipant(repository, "zas-summit", validInput(), {
    now: NOW,
    registrationNumber: () => "ZAS-2026-CONSENT02",
  });

  assert.equal(secondEvent.success, true);
  assert.equal(repository.participants.size, 1);
  assert.equal(repository.privacyConsents.size, 1);
});

test("invalid participant input is rejected before any profile data is written", () => {
  const invalidCases = [
    registrationForm({ fullName: "" }),
    registrationForm({ email: "not-an-email" }),
    registrationForm({ agreedToPrivacy: "" }),
    registrationForm({ phone: "12" }),
    registrationForm({ ticketTypeId: "not-a-uuid" }),
    registrationForm({ event_goals: "x".repeat(1001) }),
    registrationForm({ website: "spam.example" }),
  ];

  for (const form of invalidCases) {
    assert.equal(validateParticipantRegistration(form).success, false);
  }
});

test("repeated registration for the same event and email is rejected without duplicating rows", async () => {
  const repository = new MemoryRegistrationRepository();
  const options = { now: NOW, registrationNumber: () => "ZAS-2026-FIRST0001" };

  assert.equal((await registerParticipant(repository, "zas-summit", validInput(), options)).success, true);
  const repeated = await registerParticipant(repository, "zas-summit", validInput(), options);

  assert.deepEqual(repeated, {
    success: false,
    reason: "already_registered",
    error: "This email address is already registered for this event.",
  });
  assert.equal(repository.participants.size, 1);
  assert.equal(repository.registrations.size, 1);
});

test("closed events do not accept registrations", async () => {
  const repository = new MemoryRegistrationRepository();
  repository.event.status = "closed";
  const result = await registerParticipant(repository, "zas-summit", validInput(), { now: NOW });

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "event_unavailable");
  assert.equal(repository.participants.size, 0);
  assert.equal(repository.registrations.size, 0);
});

test("a ticket type belonging to another event is rejected", async () => {
  const repository = new MemoryRegistrationRepository();
  repository.ticket = { ...repository.ticket, eventId: OTHER_EVENT_ID };
  const result = await registerParticipant(repository, "zas-summit", validInput(), { now: NOW });

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "ticket_unavailable");
  assert.equal(repository.participants.size, 0);
  assert.equal(repository.registrations.size, 0);
});

test("the public registration result does not expose participant or other-registration data", async () => {
  const repository = new MemoryRegistrationRepository();
  repository.participants.set("another@example.com", { id: "private-participant-id" });
  repository.registrations.set("private-registration", {
    registrationNumber: "PRIVATE-NUMBER",
    eventId: OTHER_EVENT_ID,
    participantId: "private-participant-id",
    ticketId: OTHER_TICKET_ID,
    sellerMemberId: null,
    referralCodeSnapshot: null,
    status: "confirmed",
  });

  const result = await registerParticipant(repository, "zas-summit", validInput(), {
    now: NOW,
    registrationNumber: () => "ZAS-2026-PUBLIC0001",
  });

  assert.equal(result.success, true);
  if (!result.success) throw new Error("Expected participant registration to succeed.");
  const publicResult = registrationConfirmationForClient(
    result.registrationNumber,
    result.invoiceNumber,
    result.invoiceId,
  );
  assert.deepEqual(Object.keys(publicResult), [
    "registrationNumber",
    "invoiceNumber",
    "invoiceId",
  ]);
  assert.equal(publicResult.invoiceNumber, result.invoiceNumber);
  assert.equal(JSON.stringify(publicResult).includes("private-participant-id"), false);
  assert.equal(JSON.stringify(publicResult).includes("PRIVATE-NUMBER"), false);
});

test("invoice numbers use the event year and a monotonically allocated sequence", () => {
  assert.equal(createInvoiceNumber(2027, BigInt(1)), "ZAS-2027-0001");
  assert.equal(createInvoiceNumber(2027, BigInt(2)), "ZAS-2027-0002");
  assert.equal(createInvoiceNumber(2027, BigInt(10000)), "ZAS-2027-10000");
  assert.equal(
    getEventYear(new Date("2026-12-31T16:30:00.000Z"), "Asia/Makassar"),
    2027,
  );
  assert.throws(() => createInvoiceNumber(2027, BigInt(0)));
  assert.throws(() => createInvoiceNumber(10_000, BigInt(1)));

  const submittedInvoice = validateParticipantRegistration(
    registrationForm({ invoiceNumber: "PARTICIPANT-CONTROLLED" }),
  );
  assert.equal(submittedInvoice.success, true);
  if (submittedInvoice.success) {
    assert.equal("invoiceNumber" in submittedInvoice.data, false);
  }
});

test("the public registration page has no participant or registration lookup projection", async () => {
  const page = await readFile(
    new URL("../app/events/[eventSlug]/register/page.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(page, /participantProfile|participant_profiles|registrationNumber/);
  assert.match(page, /ticketTypes/);
});
