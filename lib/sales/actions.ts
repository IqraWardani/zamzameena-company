"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";
import { buildAttributionCommissionAdjustments } from "@/lib/sales/commission-calculation";
import { allocateSalesMemberCode } from "@/lib/sales/member-code";
import {
  validateSalesMember,
} from "@/lib/sales/validation";

export type SalesMemberFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  codes?: {
    memberName: string;
    memberCode: string;
    referralCode: string;
  };
};

const SALES_MANAGE_PERMISSION = "sales.manage";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeSalesManager(eventId: string) {
  if (!UUID_PATTERN.test(eventId)) redirect("/admin/access-denied");
  const { session, decision } = await requireAdminPermission(
    SALES_MANAGE_PERMISSION,
    "/admin/sales",
    eventId,
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");
  return { session };
}

async function salesManagerIsStillAuthorized(
  transaction: Prisma.TransactionClient,
  adminUserId: string,
  eventId: string,
): Promise<boolean> {
  const user = await transaction.adminUser.findFirst({
    where: {
      id: adminUserId,
      status: "active",
      eventAssignments: { some: { eventId } },
      userRoles: {
        some: {
          role: {
            permissions: {
              some: { permission: { code: SALES_MANAGE_PERMISSION } },
            },
          },
        },
      },
      NOT: {
        userRoles: {
          some: { role: { code: "marketing_director" } },
        },
      },
    },
    select: { id: true },
  });
  return user !== null;
}

export async function saveSalesMember(
  eventId: string,
  memberId: string | null,
  _previousState: SalesMemberFormState,
  formData: FormData,
): Promise<SalesMemberFormState> {
  const { session } = await authorizeSalesManager(eventId);
  if (memberId && !UUID_PATTERN.test(memberId)) {
    return { error: "ID anggota tidak valid." };
  }
  const validation = validateSalesMember(formData);
  if (!validation.success) {
    return {
      error: validation.error,
      fieldErrors: validation.fieldErrors,
    };
  }
  const input = validation.data;

  let codes: { memberName: string; memberCode: string; referralCode: string };
  try {
    codes = await prisma.$transaction(async (transaction) => {
      if (!(await salesManagerIsStillAuthorized(transaction, session.id, eventId))) {
        throw new Error("Sales-management permission changed during the request.");
      }

      if (input.supervisorMemberId) {
        const expectedPosition = input.position === "arm"
          ? "director"
          : input.position === "branch_manager"
            ? "arm"
            : "branch_manager";
        const supervisor = await transaction.salesMember.findFirst({
          where: {
            id: input.supervisorMemberId,
            eventId,
            status: "active",
            position: expectedPosition,
          },
          select: { id: true },
        });
        if (!supervisor) {
          throw new SalesMemberInputError("Pilih atasan aktif dengan jabatan yang sesuai.");
        }
      }

      const current = memberId
        ? await transaction.salesMember.findFirst({
            where: { id: memberId, eventId },
            select: {
              id: true,
              personId: true,
              referralCode: true,
              position: true,
              supervisorMemberId: true,
            },
          })
        : null;
      if (memberId && !current) throw new SalesMemberInputError("Anggota tidak ditemukan.");
      if (current && input.personId) {
        throw new SalesMemberInputError("Identitas global anggota yang sudah terdaftar tidak dapat diganti.");
      }
      if (current && current.position !== input.position) {
        throw new SalesMemberInputError(
          "Jabatan tidak dapat diubah karena menjadi bagian dari kode referral event.",
        );
      }

      let person: {
        id: string;
        fullName: string;
        memberCode: string;
        phone: string;
        email: string | null;
      } | null;
      if (current) {
        if (!input.fullName || !input.phone) {
          throw new SalesMemberInputError("Nama dan telepon wajib diisi.");
        }
        person = await transaction.salesPerson.update({
          where: { id: current.personId },
          data: {
            fullName: input.fullName,
            phone: input.phone,
            email: input.email,
          },
          select: { id: true, fullName: true, memberCode: true, phone: true, email: true },
        });
      } else if (input.personId) {
        person = await transaction.salesPerson.findUnique({
          where: { id: input.personId },
          select: { id: true, fullName: true, memberCode: true, phone: true, email: true },
        });
      } else {
        if (!input.fullName || !input.phone) {
          throw new SalesMemberInputError("Nama dan telepon wajib diisi.");
        }
        const memberCode = await allocateSalesMemberCode(transaction, input.position);
        person = await transaction.salesPerson.create({
          data: {
            fullName: input.fullName,
            memberCode,
            phone: input.phone,
            email: input.email,
          },
          select: { id: true, fullName: true, memberCode: true, phone: true, email: true },
        });
      }
      if (!person) throw new SalesMemberInputError("Identitas anggota tidak ditemukan.");
      if (current) {
        await transaction.salesMember.updateMany({
          where: { personId: person.id },
          data: {
            fullName: person.fullName,
            memberCode: person.memberCode,
            phone: person.phone,
            email: person.email,
          },
        });
        await transaction.auditLog.create({
          data: {
            actorAdminUserId: session.id,
            entityId: person.id,
            entityType: "sales_person",
            action: "sales_person_updated",
            metadata: {
              changedFields: ["fullName", "phone", "email"],
            },
          },
        });
      }

      const membershipData = {
        personId: person.id,
        position: input.position,
        fullName: person.fullName,
        memberCode: person.memberCode,
        phone: person.phone,
        email: person.email,
        region: input.region,
        supervisorMemberId: input.supervisorMemberId,
        joinedAt: input.joinedAt,
        quotaAmount: new Prisma.Decimal(input.quotaAmount),
      };

      let member: { id: string };
      let referralCode = current?.referralCode ?? null;
      if (current) {
        member = await transaction.salesMember.update({
          where: { id: current.id },
          data: membershipData,
          select: { id: true },
        });
      } else {
        const [allocated] = await transaction.$queryRaw<{ referral_code: string }[]>(
          Prisma.sql`
            SELECT public.allocate_sales_referral_code(
              ${eventId}::uuid,
              ${input.position}::sales_member_position
            ) AS referral_code
          `,
        );
        if (!allocated) throw new Error("Sales referral code allocation returned no code.");
        referralCode = allocated.referral_code;
        member = await transaction.salesMember.create({
          data: {
            ...membershipData,
            eventId,
            referralCode,
          },
          select: { id: true },
        });
        const linkedCodes = await transaction.$executeRaw(
          Prisma.sql`
            UPDATE public.sales_referral_codes
            SET sales_member_id = ${member.id}::uuid
            WHERE event_id = ${eventId}::uuid
              AND lower(referral_code) = lower(${referralCode})
              AND sales_member_id IS NULL
          `,
        );
        if (linkedCodes !== 1) {
          throw new Error("Sales referral code allocation could not be linked to its member.");
        }
      }
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId,
          entityId: member.id,
          entityType: "sales_member",
          action: current ? "sales_member_updated" : "sales_member_created",
          metadata: {
            position: input.position,
            personId: person.id,
            memberCode: person.memberCode,
            referralCode,
            supervisorMemberId: input.supervisorMemberId,
            quotaAmount: input.quotaAmount,
            changedFields: current
              ? [
                  "position",
                  "fullName",
                  "phone",
                  "email",
                  "region",
                  "supervisorMemberId",
                  "joinedAt",
                  "quotaAmount",
                ]
              : [],
          },
        },
      });
      if (!referralCode) {
        throw new Error("Sales member was saved without a referral code.");
      }
      return {
        memberName: person.fullName,
        memberCode: person.memberCode,
        referralCode,
      };
    });
  } catch (error) {
    if (error instanceof SalesMemberInputError) return { error: error.message };
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Kode anggota atau keanggotaan event sudah digunakan. Periksa data dan coba lagi.",
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2010"
    ) {
      console.error("Sales member database query failed; verify the latest migration is applied.", error);
      return {
        error: "Database belum siap menyimpan anggota. Pastikan migration Sales terbaru sudah diterapkan, lalu coba lagi.",
      };
    }
    console.error("Sales member save failed.", error);
    return {
      error: "Gagal menyimpan data anggota ke database. Periksa data dan koneksi, lalu coba lagi.",
    };
  }

  revalidatePath("/admin/sales");
  return {
    message: memberId ? "Data anggota diperbarui." : "Anggota berhasil ditambahkan.",
    codes,
  };
}

export async function deleteOrDeactivateSalesMember(
  eventId: string,
  memberId: string,
): Promise<void> {
  const { session } = await authorizeSalesManager(eventId);
  if (!UUID_PATTERN.test(memberId)) redirect("/admin/access-denied");

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const member = await transaction.salesMember.findFirst({
        where: { id: memberId, eventId },
        select: { id: true, status: true, position: true, memberCode: true },
      });
      if (!member) return "missing" as const;
      if (!(await salesManagerIsStillAuthorized(transaction, session.id, eventId))) {
        return "forbidden" as const;
      }
      if (member.status === "inactive") return "already_inactive" as const;

      const [registrationCount, commissionCount, subordinateCount] = await Promise.all([
        transaction.registration.count({ where: { sellerMemberId: member.id } }),
        transaction.salesCommission.count({ where: { salesMemberId: member.id } }),
        transaction.salesMember.count({
          where: { supervisorMemberId: member.id },
        }),
      ]);
      const preserveHistory =
        registrationCount > 0 || commissionCount > 0 || subordinateCount > 0;
      if (preserveHistory) {
        await transaction.salesMember.update({
          where: { id: member.id },
          data: { status: "inactive" },
        });
      } else {
        await transaction.salesMember.delete({ where: { id: member.id } });
      }
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId,
          entityId: member.id,
          entityType: "sales_member",
          action: preserveHistory ? "sales_member_deactivated" : "sales_member_deleted",
          metadata: {
            position: member.position,
            memberCode: member.memberCode,
            registrationCount,
            commissionCount,
            subordinateCount,
          },
        },
      });
      return preserveHistory ? "deactivated" as const : "deleted" as const;
    });
    if (outcome === "forbidden" || outcome === "missing") redirect("/admin/access-denied");
    revalidatePath("/admin/sales");
  } catch (error) {
    if (isNextRedirectSignal(error)) throw error;
    console.error("Sales member removal failed.", error);
    throw new Error("Anggota tidak dapat dihapus atau dinonaktifkan saat ini.");
  }
}

export async function toggleSalesMemberStatus(
  eventId: string,
  memberId: string,
): Promise<void> {
  const { session } = await authorizeSalesManager(eventId);
  if (!UUID_PATTERN.test(memberId)) redirect("/admin/access-denied");
  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const member = await transaction.salesMember.findFirst({
        where: { id: memberId, eventId },
        select: { id: true, status: true, position: true },
      });
      if (!member) return "missing" as const;
      if (!(await salesManagerIsStillAuthorized(transaction, session.id, eventId))) {
        return "forbidden" as const;
      }
      const status = member.status === "active" ? "inactive" : "active";
      await transaction.salesMember.update({
        where: { id: member.id },
        data: { status },
      });
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId,
          entityId: member.id,
          entityType: "sales_member",
          action: status === "active" ? "sales_member_reactivated" : "sales_member_deactivated",
          metadata: { position: member.position, status },
        },
      });
      return "updated" as const;
    });
    if (outcome === "forbidden" || outcome === "missing") redirect("/admin/access-denied");
    revalidatePath("/admin/sales");
  } catch (error) {
    if (isNextRedirectSignal(error)) throw error;
    console.error("Sales member status update failed.", error);
    throw new Error("Status anggota belum berhasil diubah. Pastikan atasan aktif dan struktur valid.");
  }
}

export async function correctRegistrationAttribution(
  eventId: string,
  registrationId: string,
  _previousState: SalesMemberFormState,
  formData: FormData,
): Promise<SalesMemberFormState> {
  const { session } = await authorizeSalesManager(eventId);
  if (!UUID_PATTERN.test(registrationId)) return { error: "ID registrasi tidak valid." };
  const referralCode = String(formData.get("referralCode") ?? "").trim().toUpperCase();
  if (
    referralCode &&
    !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(referralCode)
  ) {
    return { error: "Format kode referral tidak valid." };
  }

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM registrations WHERE id = ${registrationId}::uuid FOR UPDATE`,
      );
      if (!(await salesManagerIsStillAuthorized(transaction, session.id, eventId))) {
        return "forbidden" as const;
      }
      const registration = await transaction.registration.findFirst({
        where: { id: registrationId, eventId },
        select: {
          id: true,
          sellerMemberId: true,
          referralCodeSnapshot: true,
        },
      });
      if (!registration) return "missing" as const;
      const commissionEntries = await transaction.salesCommission.findMany({
        where: { registrationId: registration.id },
        select: {
          salesMemberId: true,
          invoiceId: true,
          currency: true,
          amount: true,
        },
      });
      const member = referralCode
        ? await transaction.salesMember.findFirst({
            where: {
              eventId,
              referralCode: { equals: referralCode, mode: "insensitive" },
              status: "active",
            },
            select: { id: true, referralCode: true },
          })
        : null;
      if (referralCode && !member) return "referral_missing" as const;
      const newMemberId = member?.id ?? null;
      const newReferralCode = member?.referralCode ?? null;
      if (
        registration.sellerMemberId === newMemberId &&
        registration.referralCodeSnapshot === newReferralCode
      ) {
        return "unchanged" as const;
      }

      const commissionAdjustments = buildAttributionCommissionAdjustments(
        commissionEntries,
        newMemberId,
      );
      if (commissionAdjustments.some((adjustment) => !adjustment.invoiceId)) {
        return "commission_invoice_missing" as const;
      }

      const correctionId = randomUUID();
      for (const [index, adjustment] of commissionAdjustments.entries()) {
        const note =
          `Referral attribution correction (${registration.referralCodeSnapshot ?? "none"} -> ${newReferralCode ?? "none"})`;
        const entry = await transaction.salesCommission.create({
          data: {
            salesMemberId: adjustment.salesMemberId,
            registrationId: registration.id,
            invoiceId: adjustment.invoiceId,
            entryType: "adjustment",
            amount: adjustment.amount,
            currency: adjustment.currency,
            idempotencyKey:
              `attribution:${registration.id}:${correctionId}:${index}`,
            note,
            createdByAdminUserId: session.id,
          },
          select: { id: true },
        });
        await transaction.auditLog.create({
          data: {
            actorAdminUserId: session.id,
            eventId,
            entityId: entry.id,
            entityType: "sales_commission",
            action: "sales_commission_attribution_adjusted",
            metadata: {
              registrationId: registration.id,
              previousSalesMemberId: registration.sellerMemberId,
              salesMemberId: adjustment.salesMemberId,
              referralCodeSnapshot: newReferralCode,
              amount: adjustment.amount.toFixed(2),
              currency: adjustment.currency,
              invoiceId: adjustment.invoiceId,
            },
          },
        });
      }

      await transaction.$executeRaw(
        Prisma.sql`SET LOCAL app.sales_attribution_correction = 'on'`,
      );
      await transaction.registration.update({
        where: { id: registration.id },
        data: {
          sellerMemberId: newMemberId,
          referralCodeSnapshot: newReferralCode,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId,
          entityId: registration.id,
          entityType: "registration",
          action: "sales_attribution_corrected",
          metadata: {
            previousSalesMemberId: registration.sellerMemberId,
            previousReferralCode: registration.referralCodeSnapshot,
            salesMemberId: newMemberId,
            referralCodeSnapshot: newReferralCode,
          },
        },
      });
      return "updated" as const;
    });
    switch (outcome) {
      case "forbidden":
      case "missing":
        return { error: "Registrasi tidak ditemukan atau izin sudah tidak berlaku." };
      case "commission_invoice_missing":
        return { error: "Komisi tercatat tanpa invoice. Atribusi tidak diubah agar ledger tetap konsisten." };
      case "referral_missing":
        return { error: "Kode referral tidak ditemukan pada event ini." };
      case "unchanged":
        return { message: "Atribusi tidak berubah." };
    }
  } catch (error) {
    console.error("Registration sales attribution correction failed.", error);
    return { error: "Atribusi belum berhasil dikoreksi. Tidak ada perubahan yang disimpan." };
  }
  revalidatePath("/admin/sales");
  return { message: "Atribusi penjual diperbarui dan dicatat pada audit log." };
}

class SalesMemberInputError extends Error {}

function isNextRedirectSignal(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT;"),
  );
}
