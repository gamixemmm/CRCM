type PdfTextStyle = {
  size?: number;
  bold?: boolean;
};

type PdfTableColumn<T> = {
  header: string;
  width: number;
  value: (row: T, index: number) => string;
  maxChars?: number;
  maxLines?: number;
  size?: number;
};

type BookingsReportLabels = {
  title: string;
  generated: string;
  summary: (activeCount: number, availableCount: number) => string;
  activeBookings: string;
  availableCars: string;
  noRecords: string;
  columns: {
    number: string;
    vehicle: string;
    plate: string;
    driver: string;
    broker: string;
    dates: string;
    payment: string;
    year: string;
    color: string;
    mileage: string;
    rate: string;
  };
  fallback: {
    pending: string;
    perDay: string;
  };
  paymentStatuses: Record<string, string>;
};

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 36;
const BOTTOM = 36;

function pdfEscape(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function fitText(value: string, maxChars: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
}

function wrapText(value: string, maxChars: number, maxLines = 2) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return ["-"];

  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }

    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = fitText(visible[maxLines - 1], Math.max(4, maxChars - 1));
  return visible;
}

function formatPdfDate(value: string | Date, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatPdfMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

class PdfBuilder {
  private pages: string[] = [];
  private current: string[] = [];
  private y = PAGE_HEIGHT - MARGIN;

  constructor(private title: string) {
    this.addPage();
  }

  private addPage() {
    if (this.current.length > 0) {
      this.pages.push(this.current.join("\n"));
    }
    this.current = [];
    this.y = PAGE_HEIGHT - MARGIN;
    this.text(this.title, MARGIN, this.y, { size: 16, bold: true });
    this.y -= 18;
    this.line(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y);
    this.y -= 22;
  }

  private ensureSpace(height: number) {
    if (this.y - height < BOTTOM) {
      this.addPage();
    }
  }

  text(value: string, x: number, y: number, style: PdfTextStyle = {}) {
    const font = style.bold ? "F2" : "F1";
    const size = style.size ?? 10;
    this.current.push(`BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.current.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  heading(value: string) {
    this.ensureSpace(30);
    this.text(value, MARGIN, this.y, { size: 13, bold: true });
    this.y -= 18;
  }

  paragraph(value: string) {
    this.ensureSpace(18);
    this.text(value, MARGIN, this.y, { size: 9 });
    this.y -= 18;
  }

  table<T>(columns: PdfTableColumn<T>[], rows: T[], noRecordsLabel: string) {
    const headerHeight = 22;
    const lineHeight = 9.5;
    const rowPadding = 8;
    const drawHeader = () => {
      this.ensureSpace(headerHeight * 2);
      let x = MARGIN;
      this.current.push("0.92 0.94 0.97 rg");
      this.current.push(`${MARGIN} ${this.y - 7} ${PAGE_WIDTH - MARGIN * 2} ${headerHeight} re f`);
      this.current.push("0 0 0 rg");
      columns.forEach((column) => {
        this.text(column.header, x + 4, this.y, { size: 8, bold: true });
        x += column.width;
      });
      this.y -= headerHeight;
    };

    drawHeader();

    if (rows.length === 0) {
      this.ensureSpace(24);
      this.text(noRecordsLabel, MARGIN + 4, this.y, { size: 9 });
      this.y -= 24;
      return;
    }

    rows.forEach((row, index) => {
      const cells = columns.map((column) => {
        const maxChars = column.maxChars ?? Math.max(8, Math.floor(column.width / 4.5));
        return wrapText(column.value(row, index), maxChars, column.maxLines ?? 2);
      });
      const rowHeight = Math.max(24, Math.max(...cells.map((cell) => cell.length)) * lineHeight + rowPadding * 2);

      this.ensureSpace(rowHeight + 4);

      if (index % 2 === 1) {
        this.current.push("0.985 0.985 0.985 rg");
        this.current.push(`${MARGIN} ${this.y - rowHeight + 7} ${PAGE_WIDTH - MARGIN * 2} ${rowHeight} re f`);
        this.current.push("0 0 0 rg");
      }

      let x = MARGIN;
      columns.forEach((column, columnIndex) => {
        cells[columnIndex].forEach((line, lineIndex) => {
          this.text(line, x + 4, this.y - lineIndex * lineHeight, { size: column.size ?? 8 });
        });
        x += column.width;
      });
      this.y -= rowHeight;
      this.current.push("0.9 0.9 0.9 RG");
      this.line(MARGIN, this.y + 7, PAGE_WIDTH - MARGIN, this.y + 7);
      this.current.push("0 0 0 RG");
    });
    this.y -= 12;
  }

  build() {
    if (this.current.length > 0) {
      this.pages.push(this.current.join("\n"));
    }

    const objects: string[] = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    const pageRefs = this.pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
    objects.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${this.pages.length} >>`);

    this.pages.forEach((content, index) => {
      const pageObj = 3 + index * 2;
      const contentObj = pageObj + 1;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObj} 0 R >>`);
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });

    let body = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(body.length);
      body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = body.length;
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      body += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return body;
  }
}

export function createBookingsReportPdf({
  companyName,
  activeBookings,
  availableVehicles,
  labels,
  locale,
}: {
  companyName: string;
  activeBookings: any[];
  availableVehicles: any[];
  labels: BookingsReportLabels;
  locale?: string;
}) {
  const generatedAt = new Date();
  const pdf = new PdfBuilder(labels.title);

  pdf.paragraph(`${companyName} - ${labels.generated}: ${formatPdfDate(generatedAt, locale)}`);
  pdf.paragraph(labels.summary(activeBookings.length, availableVehicles.length));

  pdf.heading(labels.activeBookings);
  pdf.table(
    [
      { header: labels.columns.number, width: 30, value: (_row, index) => String(index + 1), maxLines: 1 },
      { header: labels.columns.vehicle, width: 145, value: (b) => `${b.vehicle.brand} ${b.vehicle.model}` },
      { header: labels.columns.plate, width: 80, value: (b) => b.vehicle.plateNumber || "-", maxLines: 1 },
      { header: labels.columns.driver, width: 125, value: (b) => `${b.driverFirstName || ""} ${b.driverLastName || ""}`.trim() || "-" },
      { header: labels.columns.broker, width: 125, value: (b) => `${b.customer.firstName || ""} ${b.customer.lastName || ""}`.trim() || "-" },
      { header: labels.columns.dates, width: 165, value: (b) => `${formatPdfDate(b.startDate, locale)} - ${formatPdfDate(b.endDate, locale)}`, maxLines: 1 },
      {
        header: labels.columns.payment,
        width: 90,
        value: (b) => {
          const status = b.invoice?.paymentStatus;
          return status ? labels.paymentStatuses[status] || status : labels.fallback.pending;
        },
      },
    ],
    activeBookings,
    labels.noRecords
  );

  pdf.heading(labels.availableCars);
  pdf.table(
    [
      { header: labels.columns.number, width: 30, value: (_row, index) => String(index + 1), maxLines: 1 },
      { header: labels.columns.vehicle, width: 190, value: (v) => `${v.brand} ${v.model}` },
      { header: labels.columns.plate, width: 105, value: (v) => v.plateNumber || "-", maxLines: 1 },
      { header: labels.columns.year, width: 55, value: (v) => String(v.year || "-"), maxLines: 1 },
      { header: labels.columns.color, width: 95, value: (v) => v.color || "-" },
      { header: labels.columns.mileage, width: 105, value: (v) => `${(v.mileage || 0).toLocaleString()} km`, maxLines: 1 },
      { header: labels.columns.rate, width: 120, value: (v) => `${formatPdfMoney(v.dailyRate || 0)} / ${labels.fallback.perDay}` },
    ],
    availableVehicles,
    labels.noRecords
  );

  return pdf.build();
}
