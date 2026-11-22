import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildParticipantWorkbook } from "../lib/admin/participant-export";

test("participant workbook exports all requested columns and print layout", async () => {
  const exportedAt = new Date("2026-11-17T08:00:00.000Z");
  const buffer = await buildParticipantWorkbook({
    eventName: "Synergy Preneur Summit 2027",
    exportedAt,
    timezone: "Asia/Makassar",
    participants: [
      {
        fullName: "Paid Participant",
        phone: "081234567890",
        email: "paid@example.test",
        address: "Jl. Contoh No. 1",
        city: "Makassar",
        status: "Paid",
      },
      {
        fullName: "Pending Participant",
        phone: "082345678901",
        email: "pending@example.test",
        address: "Jl. Contoh No. 2",
        city: "Gowa",
        status: "Pending",
      },
    ],
  });
  const workbook = new ExcelJS.Workbook();
  const fileContents = Buffer.from(buffer) as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(fileContents);
  const worksheet = workbook.getWorksheet("Daftar Peserta");

  assert.ok(worksheet);
  assert.deepEqual(
    Array.from({ length: 7 }, (_, index) => worksheet.getRow(5).getCell(index + 1).value),
    ["No.", "Nama", "Nomor HP", "Email", "Alamat", "Kota", "Status"],
  );
  assert.equal(worksheet.getCell("A1").value, "DAFTAR PESERTA");
  assert.equal(worksheet.getCell("A2").value, "Synergy Preneur Summit 2027");
  assert.equal(worksheet.getCell("B6").value, "Paid Participant");
  assert.equal(worksheet.getCell("C6").value, "081234567890");
  assert.equal(worksheet.getCell("C6").numFmt, "@");
  assert.equal(worksheet.getCell("G6").value, "Paid");
  assert.equal(worksheet.getCell("B7").value, "Pending Participant");
  assert.equal(worksheet.getCell("G7").value, "Pending");
  assert.equal(worksheet.pageSetup.paperSize, 9);
  assert.equal(worksheet.pageSetup.orientation, "landscape");
  assert.equal(worksheet.pageSetup.fitToWidth, 1);
  assert.equal(worksheet.pageSetup.fitToHeight, 0);
  assert.equal(worksheet.pageSetup.fitToPage, true);
  assert.equal(worksheet.pageSetup.printTitlesRow, "5:5");
  assert.match(worksheet.headerFooter.oddFooter ?? "", /Halaman &P dari &N/);
  const firstParticipantFill = worksheet.getCell("A6").fill;
  const secondParticipantFill = worksheet.getCell("A7").fill;
  assert.equal(firstParticipantFill.type, "pattern");
  assert.equal(secondParticipantFill.type, "pattern");
  if (firstParticipantFill.type === "pattern" && secondParticipantFill.type === "pattern") {
    assert.equal(firstParticipantFill.fgColor?.argb, "FFFFFFFF");
    assert.equal(secondParticipantFill.fgColor?.argb, "FFF5F1E9");
  }
});
