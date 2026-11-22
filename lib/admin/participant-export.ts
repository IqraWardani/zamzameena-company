import ExcelJS from "exceljs";

export type ParticipantExportRow = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  status: "Paid" | "Pending";
};

const HEADER_ROW = 5;

export async function buildParticipantWorkbook({
  eventName,
  exportedAt,
  timezone,
  participants,
}: {
  eventName: string;
  exportedAt: Date;
  timezone: string;
  participants: ParticipantExportRow[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Zamzameena Event Administration";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;

  const worksheet = workbook.addWorksheet("Daftar Peserta", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });
  worksheet.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;
  worksheet.headerFooter.oddFooter = "&CHalaman &P dari &N";

  worksheet.columns = [
    { key: "number", width: 7 },
    { key: "name", width: 25 },
    { key: "phone", width: 18, style: { numFmt: "@" } },
    { key: "email", width: 30 },
    { key: "address", width: 45 },
    { key: "city", width: 18 },
    { key: "status", width: 14 },
  ];

  worksheet.mergeCells("A1:G1");
  worksheet.getCell("A1").value = "DAFTAR PESERTA";
  worksheet.getCell("A1").font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: "FF17232B" },
  };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 26;

  worksheet.mergeCells("A2:G2");
  worksheet.getCell("A2").value = eventName;
  worksheet.getCell("A2").font = {
    name: "Arial",
    size: 12,
    bold: true,
    color: { argb: "FF17232B" },
  };
  worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A3:G3");
  worksheet.getCell("A3").value =
    `Diekspor: ${new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: timezone,
    }).format(exportedAt)}`;
  worksheet.getCell("A3").font = {
    name: "Arial",
    size: 9,
    color: { argb: "FF56636A" },
  };
  worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  const headers = [
    "No.",
    "Nama",
    "Nomor HP",
    "Email",
    "Alamat",
    "Kota",
    "Status",
  ];
  const headerRow = worksheet.getRow(HEADER_ROW);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FF101820" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD5AD78" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9A805D" } },
      bottom: { style: "thin", color: { argb: "FF9A805D" } },
      left: { style: "thin", color: { argb: "FF9A805D" } },
      right: { style: "thin", color: { argb: "FF9A805D" } },
    };
  });

  participants.forEach((participant, index) => {
    const row = worksheet.addRow([
      index + 1,
      participant.fullName,
      participant.phone,
      participant.email,
      participant.address,
      participant.city,
      participant.status,
    ]);
    row.height = Math.min(60, Math.max(22, Math.ceil(participant.address.length / 52) * 15));
    row.eachCell((cell, columnNumber) => {
      cell.font = { name: "Arial", size: 9, color: { argb: "FF17232B" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : "FFF5F1E9" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: columnNumber === 1 || columnNumber === 7 ? "center" : "left",
        wrapText: columnNumber === 5,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9DDE0" } },
        bottom: { style: "thin", color: { argb: "FFD9DDE0" } },
        left: { style: "thin", color: { argb: "FFD9DDE0" } },
        right: { style: "thin", color: { argb: "FFD9DDE0" } },
      };
    });
    row.getCell(3).numFmt = "@";
  });

  worksheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: headers.length },
  };

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
