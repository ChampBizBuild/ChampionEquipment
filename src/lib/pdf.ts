import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BusinessSettings, Invoice, InvoiceLineItem } from "./types";
import {
  HIRE_TERMS_TEXT,
  SAFETY_TERMS_TEXT,
  selectedAttachmentsLabel,
  type HireDetails,
} from "./hireAgreement";

/** Helvetica/WinAnsi can't draw many Unicode glyphs — normalize for pdf-lib. */
function pdfSafe(text: string): string {
  return String(text ?? "")
    .replace(/\u2192/g, "->") // →
    .replace(/[\u2013\u2014]/g, "-") // – —
    .replace(/[\u2018\u2019]/g, "'") // ‘ ’
    .replace(/[\u201C\u201D]/g, '"') // “ ”
    .replace(/\u2022/g, "-") // •
    .replace(/\u00A0/g, " ") // nbsp
    .replace(/[^\x00-\xFF]/g, "?");
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const paragraph of pdfSafe(text).split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function buildAcceptancePdf(params: {
  settings: BusinessSettings | null;
  clientName: string;
  clientBusiness: string;
  clientPhone: string;
  clientEmail: string;
  equipmentName: string;
  dayRate: number;
  pickupDate: string;
  dropoffDate: string;
  acceptedName: string;
  acceptedAt: string;
  acceptedIp: string;
  hireDetails: HireDetails;
  termsTitle: string;
  termsBody: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage();
  let { width, height } = page.getSize();
  let y = height - 50;
  const margin = 50;
  const maxWidth = 92;
  const d = params.hireDetails;
  const biz = params.settings;

  const ensureSpace = (needed: number) => {
    if (y < needed) {
      page = pdf.addPage();
      ({ width, height } = page.getSize());
      y = height - 50;
    }
  };

  const write = (text: string, size = 10, useBold = false) => {
    const lines = wrapText(text, maxWidth);
    for (const line of lines) {
      ensureSpace(40);
      page.drawText(line || " ", {
        x: margin,
        y,
        size,
        font: useBold ? bold : font,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: width - margin * 2,
      });
      y -= size + 4;
    }
  };

  write(biz?.business_name || "Champion Equipment", 16, true);
  write("Machine Hire Agreement", 12, true);
  write("Craig R Champion — Sole Trader");
  if (biz?.abn) write(`ABN: ${biz.abn}`);
  if (biz?.address) write(biz.address);
  write(biz?.phone || "1800 673 922");
  write(biz?.email || "admin@championequipment.com.au");
  y -= 6;

  write(`Job Reference: ${d.job_reference || "—"}`);
  y -= 6;
  write("1. Client Details", 11, true);
  write(`Client / Business Name: ${params.clientBusiness}`);
  write(`Site Contact: ${d.site_contact || params.clientName}`);
  write(`Phone: ${d.site_phone || params.clientPhone || "—"}`);
  write(`Email: ${params.clientEmail}`);
  write(`Site Address: ${d.site_address || "—"}`);
  y -= 6;

  write("2. Hire Details", 11, true);
  write(`Machine Description: ${params.equipmentName}`);
  write(`Daily Rate (ex. GST): $${Number(params.dayRate).toFixed(2)}`);
  write(`Start Date: ${params.pickupDate}`);
  write(`End Date: ${params.dropoffDate}`);
  write(`Preferred Collection Time: ${d.preferred_collection_time || "—"}`);
  write(`Preferred Return Time: ${d.preferred_return_time || "—"}`);
  write(`Quantity / Delivery Notes: ${d.quantity_notes || "—"}`);
  write(`Additional Hire Charge: ${d.additional_hire_charge || "—"}`);
  write(`Attachments: ${selectedAttachmentsLabel(d.attachments)}`);
  write(
    `Require operator: ${
      d.require_operator === true
        ? "Yes"
        : d.require_operator === false
          ? "No"
          : "—"
    }`,
  );
  if (d.require_operator) {
    write(`Operator Name: ${d.operator_name || "—"}`);
    write(`Operator Rate/hr: ${d.operator_rate ? `$${d.operator_rate}` : "—"}`);
  }
  y -= 6;

  write("3. Hire Terms", 11, true);
  write(HIRE_TERMS_TEXT, 9);
  write(`Travel / Float Fee: ${d.travel_float_fee || "—"}`);
  write(
    `Wet Weather: ${
      d.wet_weather === "charged"
        ? "Charged"
        : d.wet_weather === "not_charged"
          ? "Not Charged"
          : "—"
    }`,
  );
  y -= 6;

  write("4. Safety & Site Conditions", 11, true);
  write(SAFETY_TERMS_TEXT, 9);
  write(
    `LCC Insurance: ${
      d.lcc_insurance === true
        ? "Yes - hirer has own cover"
        : d.lcc_insurance === false
          ? "No - Champion Equipment LCC at 10% of hire"
          : "-"
    }`,
  );
  y -= 6;

  write("5. Payment Terms", 11, true);
  write("Payment Due: Prior to hire");
  y -= 6;

  write("6. Signatures / Acceptance", 11, true);
  write(`Client Print Name: ${params.acceptedName}`);
  write(`Accepted at: ${params.acceptedAt}`);
  write(`Accepted IP: ${params.acceptedIp}`);
  write("Hire Company Representative: Champion Equipment");
  y -= 10;

  write(params.termsTitle, 12, true);
  write(params.termsBody, 9);
  write(`Client Acceptance — Print Name: ${params.acceptedName}`);
  write(`Date: ${params.acceptedAt}`);

  return pdf.save();
}

export async function buildInvoicePdf(params: {
  settings: BusinessSettings;
  invoice: Pick<
    Invoice,
    | "invoice_number"
    | "line_items"
    | "subtotal"
    | "gst"
    | "total"
    | "due_date"
    | "status"
  > & { kind?: Invoice["kind"] };
  clientBusiness: string;
  clientName: string;
  clientEmail: string;
  clientAbn?: string | null;
  equipmentName: string;
  pickupDate: string;
  dropoffDate: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 48;
  const right = width - margin;
  const contentW = right - margin;

  const black = rgb(0.08, 0.08, 0.08);
  const muted = rgb(0.35, 0.35, 0.35);
  const lineGrey = rgb(0.82, 0.82, 0.82);
  const soft = rgb(0.96, 0.96, 0.96);
  const accent = rgb(0.99, 0.72, 0.07); // brand yellow
  const green = rgb(0.18, 0.35, 0.15);

  const moneyAud = (n: number) =>
    `$${Number(n || 0).toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "-";
    const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    opts?: {
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      align?: "left" | "right";
      maxWidth?: number;
    },
  ) => {
    const safe = pdfSafe(value) || " ";
    const useFont = opts?.bold ? bold : font;
    const color = opts?.color ?? black;
    let drawX = x;
    if (opts?.align === "right") {
      const w = useFont.widthOfTextAtSize(safe, size);
      drawX = x - w;
    }
    page.drawText(safe, {
      x: drawX,
      y,
      size,
      font: useFont,
      color,
      maxWidth: opts?.maxWidth,
    });
  };

  const { settings, invoice } = params;
  const isAdditional = invoice.kind === "additional";
  const kindTitle = isAdditional ? "Additional charges" : "Equipment hire";
  const items = (invoice.line_items || []) as InvoiceLineItem[];

  // Top accent bar
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: accent,
  });

  // Header: business left, TAX INVOICE right
  let y = height - 48;
  text(settings.business_name || "Champion Equipment", margin, y, 18, {
    bold: true,
  });
  text("TAX INVOICE", right, y, 18, { bold: true, align: "right", color: green });

  y -= 16;
  if (settings.trading_as) {
    text(`Trading as ${settings.trading_as}`, margin, y, 9, { color: muted });
  }
  text(invoice.invoice_number, right, y, 11, {
    bold: true,
    align: "right",
  });

  y -= 12;
  const bizLines = [
    settings.abn ? `ABN ${settings.abn}` : "",
    settings.address || "",
    [settings.phone, settings.email].filter(Boolean).join("  |  "),
  ].filter(Boolean);
  for (const row of bizLines) {
    text(row, margin, y, 8.5, { color: muted });
    y -= 11;
  }

  y -= 6;
  page.drawRectangle({
    x: margin,
    y: y - 2,
    width: contentW,
    height: 1.5,
    color: black,
  });

  // Meta row
  y -= 22;
  text("Invoice type", margin, y, 8, { color: muted });
  text("Issue date", margin + 150, y, 8, { color: muted });
  text("Due date", margin + 280, y, 8, { color: muted });
  text("Status", right, y, 8, { color: muted, align: "right" });

  y -= 13;
  text(kindTitle, margin, y, 10, { bold: true });
  text(formatDate(new Date().toISOString()), margin + 150, y, 10);
  text(formatDate(invoice.due_date), margin + 280, y, 10, { bold: true });
  text(String(invoice.status).toUpperCase(), right, y, 10, {
    bold: true,
    align: "right",
  });

  // Bill to + hire details
  y -= 28;
  const boxTop = y + 12;
  const boxH = 78;
  page.drawRectangle({
    x: margin,
    y: boxTop - boxH,
    width: contentW * 0.55,
    height: boxH,
    color: soft,
  });
  page.drawRectangle({
    x: margin + contentW * 0.55 + 10,
    y: boxTop - boxH,
    width: contentW * 0.45 - 10,
    height: boxH,
    color: soft,
  });

  let leftY = boxTop - 16;
  text("BILL TO", margin + 10, leftY, 8, { bold: true, color: muted });
  leftY -= 14;
  text(params.clientBusiness, margin + 10, leftY, 11, { bold: true });
  leftY -= 13;
  text(params.clientName, margin + 10, leftY, 9);
  leftY -= 12;
  text(params.clientEmail, margin + 10, leftY, 9, { color: muted });
  if (params.clientAbn) {
    leftY -= 12;
    text(`ABN ${params.clientAbn}`, margin + 10, leftY, 9, { color: muted });
  }

  const hireX = margin + contentW * 0.55 + 20;
  let rightY = boxTop - 16;
  text("HIRE DETAILS", hireX, rightY, 8, { bold: true, color: muted });
  rightY -= 14;
  text(params.equipmentName, hireX, rightY, 11, {
    bold: true,
    maxWidth: contentW * 0.45 - 28,
  });
  rightY -= 14;
  text("Hire period", hireX, rightY, 8, { color: muted });
  rightY -= 12;
  text(
    `${formatDate(params.pickupDate)} to ${formatDate(params.dropoffDate)}`,
    hireX,
    rightY,
    9,
  );

  y = boxTop - boxH - 28;

  // Line items table header
  const colDesc = margin + 8;
  const colQty = margin + contentW * 0.58;
  const colUnit = margin + contentW * 0.72;
  const colAmt = right - 8;

  page.drawRectangle({
    x: margin,
    y: y - 6,
    width: contentW,
    height: 22,
    color: black,
  });
  text("Description", colDesc, y, 9, { bold: true, color: rgb(1, 1, 1) });
  text("Qty", colQty, y, 9, { bold: true, color: rgb(1, 1, 1) });
  text("Unit", colUnit, y, 9, { bold: true, color: rgb(1, 1, 1) });
  text("Amount", colAmt, y, 9, {
    bold: true,
    color: rgb(1, 1, 1),
    align: "right",
  });

  y -= 28;
  if (!items.length) {
    text("No charges listed", colDesc, y, 9, { color: muted });
    y -= 18;
  } else {
    items.forEach((item, i) => {
      if (i % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: y - 6,
          width: contentW,
          height: 20,
          color: soft,
        });
      }
      text(item.description, colDesc, y, 9, {
        maxWidth: contentW * 0.52,
      });
      text(String(item.quantity), colQty, y, 9);
      text(moneyAud(item.unit_amount), colUnit, y, 9);
      text(moneyAud(item.amount), colAmt, y, 9, { align: "right" });
      y -= 20;
    });
  }

  page.drawRectangle({
    x: margin,
    y: y + 8,
    width: contentW,
    height: 1,
    color: lineGrey,
  });

  // Totals
  y -= 8;
  const totalsX = margin + contentW * 0.58;
  const drawTotalRow = (
    label: string,
    value: string,
    size: number,
    strong = false,
  ) => {
    text(label, totalsX, y, size, {
      bold: strong,
      color: strong ? black : muted,
    });
    text(value, colAmt, y, size, {
      bold: strong,
      align: "right",
      color: black,
    });
    y -= size + 8;
  };

  drawTotalRow("Subtotal", moneyAud(invoice.subtotal), 10);
  if (Number(invoice.gst) > 0) {
    drawTotalRow("GST (10%)", moneyAud(invoice.gst), 10);
  } else {
    drawTotalRow("GST", "Not applicable", 10);
  }
  page.drawRectangle({
    x: totalsX - 8,
    y: y - 4,
    width: right - (totalsX - 8),
    height: 26,
    color: accent,
  });
  text(
    Number(invoice.gst) > 0 ? "Total due (AUD)" : "Total due (AUD, no GST)",
    totalsX,
    y + 5,
    11,
    { bold: true },
  );
  text(moneyAud(invoice.total), colAmt, y + 5, 12, {
    bold: true,
    align: "right",
  });

  // Remittance box
  y -= 50;
  const remTop = y;
  const remH = 100;
  const remBottom = remTop - remH;
  page.drawRectangle({
    x: margin,
    y: remBottom,
    width: contentW,
    height: remH,
    borderColor: lineGrey,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin,
    y: remBottom,
    width: 4,
    height: remH,
    color: green,
  });

  text("PAYMENT DETAILS", margin + 14, remTop - 16, 9, {
    bold: true,
    color: green,
  });
  text(
    "Please use the invoice number as your payment reference.",
    margin + 14,
    remTop - 30,
    8.5,
    { color: muted },
  );

  const payRows: [string, string][] = [
    ["Account name", settings.account_name || "-"],
    ["Bank", settings.bank_name || "-"],
    ["BSB", settings.bsb || "-"],
    ["Account number", settings.account_number || "-"],
    ["Reference", invoice.invoice_number],
  ];
  let payY = remTop - 48;
  for (const [label, value] of payRows) {
    text(label, margin + 14, payY, 8.5, { color: muted });
    text(value, margin + 120, payY, 8.5, { bold: true });
    payY -= 12;
  }

  // Footer
  text(
    "Thank you for hiring with Champion Equipment.",
    margin,
    36,
    8,
    { color: muted },
  );
  text(
    Number(invoice.gst) > 0
      ? "This document is a tax invoice for GST purposes."
      : "Not GST-registered. No GST charged on this invoice.",
    margin,
    24,
    8,
    { color: muted },
  );

  return pdf.save();
}
