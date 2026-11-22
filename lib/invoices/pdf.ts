import PDFDocument from "pdfkit";

export type InvoicePdfLine = {
  description: string;
  quantity: number;
  unitPrice: string | null;
  total: string;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  issuedAt: Date;
  amountDue: string;
  currency: string;
  status: "pending" | "paid" | string;
  registrationNumber: string;
  eventName: string;
  eventStartsAt: Date;
  eventEndsAt: Date;
  eventTimezone: string;
  eventLocation: string | null;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  ticketLines: InvoicePdfLine[];
  subtotal: string;
  discountAmount?: string;
  additionalFees?: string;
  paymentMethod?: string | null;
};

const COLORS = {
  black: "#171717",
  dark: "#3f3f46",
  gray: "#666666",
  lightGray: "#d4d4d8",
  rowGray: "#f4f4f5",
  white: "#ffffff",
  paid: "#166534",
  pending: "#52525b",
};

const PAGE = {
  left: 48,
  right: 547,
  top: 42,
  footer: 770,
};

function formatCurrency(amount: string, currency: string): string {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return `${amount} ${currency.trim()}`;
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency.trim(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numericAmount).replace(/[\s\u00a0\u202f]+/g, " ").trim();
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return `${amount} ${currency.trim()}`;
  }
}

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function formatEventDate(invoice: InvoicePdfData): string {
  const start = formatDate(invoice.eventStartsAt, invoice.eventTimezone);
  const end = formatDate(invoice.eventEndsAt, invoice.eventTimezone);
  return start === end
    ? start
    : `${start} - ${end}`;
}

export function createInvoicePdf(invoice: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      layout: "portrait",
      margins: { top: PAGE.top, bottom: 56, left: PAGE.left, right: 48 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const width = PAGE.right - PAGE.left;
    const tableColumns = [
      { title: "Description", x: PAGE.left, width: 235, align: "left" as const },
      { title: "Quantity", x: PAGE.left + 235, width: 55, align: "center" as const },
      { title: "Unit Price", x: PAGE.left + 290, width: 105, align: "right" as const },
      { title: "Total", x: PAGE.left + 395, width: width - 395, align: "right" as const },
    ];
    const tableHeaderHeight = 27;
    let cursorY = PAGE.top;

    function drawDivider(y: number) {
      document.moveTo(PAGE.left, y).lineTo(PAGE.right, y)
        .lineWidth(0.7).strokeColor(COLORS.lightGray).stroke();
    }

    function drawTableHeader() {
      document.rect(PAGE.left, cursorY, width, tableHeaderHeight).fill(COLORS.dark);
      for (const column of tableColumns) {
        document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white).text(
          column.title,
          column.x + 8,
          cursorY + 9,
          { width: column.width - 16, align: column.align, lineBreak: false },
        );
      }
      cursorY += tableHeaderHeight;
    }

    function drawHeader() {
      document.font("Helvetica-Bold").fontSize(27).fillColor(COLORS.black)
        .text("INVOICE", PAGE.left, PAGE.top, { lineBreak: false });
      document.font("Helvetica").fontSize(9).fillColor(COLORS.gray)
        .text(`Invoice Number: ${invoice.invoiceNumber}`, PAGE.left, PAGE.top + 4, {
          width,
          align: "right",
          lineBreak: false,
        })
        .text(`Invoice Date: ${formatDate(invoice.issuedAt, invoice.eventTimezone)}`, PAGE.left, PAGE.top + 20, {
          width,
          align: "right",
          lineBreak: false,
        });
      drawDivider(PAGE.top + 47);

      document.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.black)
        .text("ZAMZAMEENA AINSA SYNERGY", PAGE.left, PAGE.top + 61);

      const infoY = PAGE.top + 97;
      const gap = 28;
      const columnWidth = (width - gap) / 2;
      const rightColumnX = PAGE.left + columnWidth + gap;
      document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.dark)
        .text("BILLING INFORMATION", PAGE.left, infoY)
        .text("EVENT INFORMATION", rightColumnX, infoY);

      function drawInfo(label: string, value: string, x: number, y: number, column: number) {
        const safeValue = value || "-";
        const valueHeight = document.font("Helvetica").fontSize(9).heightOfString(
          safeValue,
          { width: column },
        );
        document.font("Helvetica").fontSize(8).fillColor(COLORS.gray)
          .text(label, x, y, { width: column });
        document.font("Helvetica").fontSize(9).fillColor(COLORS.black)
          .text(safeValue, x, y + 10, { width: column });
        return y + 10 + valueHeight + 9;
      }

      let billingY = infoY + 19;
      billingY = drawInfo("Name", invoice.participantName, PAGE.left, billingY, columnWidth);
      billingY = drawInfo("Email", invoice.participantEmail, PAGE.left, billingY, columnWidth);
      billingY = drawInfo("Phone Number", invoice.participantPhone, PAGE.left, billingY, columnWidth);

      let eventY = infoY + 19;
      eventY = drawInfo("Event Name", invoice.eventName, rightColumnX, eventY, columnWidth);
      eventY = drawInfo("Event Date", formatEventDate(invoice), rightColumnX, eventY, columnWidth);
      if (invoice.eventLocation) {
        eventY = drawInfo("Event Location", invoice.eventLocation, rightColumnX, eventY, columnWidth);
      }
      cursorY = Math.max(billingY, eventY) + 11;
    }

    function ensureSpace(height: number, repeatTableHeader = false) {
      if (cursorY + height <= PAGE.footer - 18) return;
      document.addPage();
      cursorY = PAGE.top;
      if (repeatTableHeader) drawTableHeader();
    }

    drawHeader();
    document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.dark)
      .text("TICKET DETAILS", PAGE.left, cursorY);
    cursorY += 17;
    drawTableHeader();

    invoice.ticketLines.forEach((line, index) => {
      const descriptionHeight = document.font("Helvetica").fontSize(9).heightOfString(
        line.description,
        { width: tableColumns[0].width - 16 },
      );
      const rowHeight = Math.max(34, descriptionHeight + 16);
      ensureSpace(rowHeight, true);
      if (index % 2 === 0) {
        document.rect(PAGE.left, cursorY, width, rowHeight).fill(COLORS.rowGray);
      }
      const values = [
        line.description,
        String(line.quantity),
        line.unitPrice
          ? formatCurrency(line.unitPrice, invoice.currency)
          : "-",
        formatCurrency(line.total, invoice.currency),
      ];
      tableColumns.forEach((column, columnIndex) => {
        document.font("Helvetica").fontSize(9).fillColor(COLORS.black).text(
          values[columnIndex],
          column.x + 8,
          cursorY + 10,
          {
            width: column.width - 16,
            align: column.align,
            height: rowHeight - 12,
            ellipsis: true,
          },
        );
      });
      document.rect(PAGE.left, cursorY, width, rowHeight)
        .lineWidth(0.45).strokeColor(COLORS.lightGray).stroke();
      cursorY += rowHeight;
    });

    cursorY += 16;
    const summaryLabelX = PAGE.right - 190;
    const summaryValueX = PAGE.right - 110;
    const summaryRows = [
      ["Subtotal", formatCurrency(invoice.subtotal, invoice.currency)],
      ...(invoice.discountAmount && Number(invoice.discountAmount) > 0
        ? [["Discount", `- ${formatCurrency(invoice.discountAmount, invoice.currency)}`]]
        : []),
      ...(invoice.additionalFees
        ? [["Additional Fees", formatCurrency(invoice.additionalFees, invoice.currency)]]
        : []),
    ];
    ensureSpace(summaryRows.length * 22 + 52);
    summaryRows.forEach(([label, amount]) => {
      document.font("Helvetica").fontSize(9).fillColor(COLORS.gray)
        .text(label, summaryLabelX, cursorY, { width: 100 });
      document.font("Helvetica").fontSize(9).fillColor(COLORS.black)
        .text(amount, summaryValueX, cursorY, { width: 110, align: "right" });
      cursorY += 21;
    });
    drawDivider(cursorY + 2);
    cursorY += 13;
    document.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.black)
      .text("Total", summaryLabelX, cursorY, { width: 100 });
    document.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.black)
      .text(formatCurrency(invoice.amountDue, invoice.currency), summaryValueX, cursorY, {
        width: 110,
        align: "right",
      });
    cursorY += 30;

    ensureSpace(64);
    const paymentStatus = invoice.status === "paid" ? "PAID" : "PENDING";
    document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.dark)
      .text("PAYMENT INFORMATION", PAGE.left, cursorY);
    cursorY += 18;
    document.font("Helvetica").fontSize(9).fillColor(COLORS.gray)
      .text("Payment Status", PAGE.left, cursorY);
    document.font("Helvetica-Bold").fontSize(9)
      .fillColor(paymentStatus === "PAID" ? COLORS.paid : COLORS.pending)
      .text(paymentStatus, PAGE.left + 105, cursorY);
    if (invoice.paymentMethod) {
      document.font("Helvetica").fontSize(9).fillColor(COLORS.gray)
        .text("Payment Method", PAGE.left + 250, cursorY);
      document.font("Helvetica").fontSize(9).fillColor(COLORS.black)
        .text(invoice.paymentMethod, PAGE.left + 345, cursorY, { width: 150 });
    }
    cursorY += 30;

    ensureSpace(105);
    document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.dark)
      .text("ADDITIONAL NOTES", PAGE.left, cursorY);
    cursorY += 15;
    document.font("Helvetica").fontSize(8.5).fillColor(COLORS.gray)
      .text(
        "Please keep this invoice as your booking reference. Your ticket order will be considered paid after payment verification by the administrator.",
        PAGE.left,
        cursorY,
        { width },
      );
    cursorY += 38;

    document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.dark)
      .text("TERMS AND CONDITIONS", PAGE.left, cursorY);
    cursorY += 15;
    const terms = [
      "1. This invoice serves as a ticket booking statement.",
      "2. Payment must be completed according to the amount stated in this invoice.",
      "3. Booking confirmation is subject to payment verification by the administrator.",
      "4. Ticket usage is subject to the event organizer's terms and conditions.",
    ];
    for (const term of terms) {
      const height = document.font("Helvetica").fontSize(8).heightOfString(term, { width });
      ensureSpace(height + 6);
      document.font("Helvetica").fontSize(8).fillColor(COLORS.gray)
        .text(term, PAGE.left, cursorY, { width });
      cursorY += height + 5;
    }

    const pages = document.bufferedPageRange();
    for (let pageIndex = pages.start; pageIndex < pages.start + pages.count; pageIndex += 1) {
      document.switchToPage(pageIndex);
      drawDivider(PAGE.footer - 14);
      document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.dark)
        .text("ZAMZAMEENA AINSA SYNERGY", PAGE.left, PAGE.footer, { lineBreak: false });
      document.font("Helvetica").fontSize(8).fillColor(COLORS.gray)
        .text(`Page ${pageIndex + 1} of ${pages.count}`, PAGE.left, PAGE.footer, {
          width,
          align: "right",
          lineBreak: false,
        });
    }

    document.end();
  });
}
