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
  maintenanceCars: string;
  todayInvoices: string;
  weekInvoices: string;
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
  fields: {
    total: string;
    paid: string;
    due: string;
    method: string;
    status: string;
    pickup: string;
    return: string;
    phone: string;
    cin: string;
    license: string;
    secondDriver: string;
    company: string;
    ice: string;
    notes: string;
    year: string;
    color: string;
    mileage: string;
    customer: string;
    invoice: string;
    income: string;
    created: string;
    service: string;
    provider: string;
    cost: string;
  };
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
  const lines: string[] = [];
  const paragraphs = value.split("\n");

  paragraphs.forEach((paragraph) => {
    const words = paragraph.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (words.length === 0) return;

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
  });

  if (lines.length === 0) return ["-"];
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

function clean(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function fullName(first?: string | null, last?: string | null) {
  return `${first || ""} ${last || ""}`.trim() || "-";
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
  activeMaintenance,
  todayInvoices,
  weekInvoices,
  labels,
  locale,
}: {
  companyName: string;
  activeBookings: any[];
  availableVehicles: any[];
  activeMaintenance: any[];
  todayInvoices: any[];
  weekInvoices: any[];
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
      { header: labels.columns.number, width: 24, value: (_row, index) => String(index + 1), maxLines: 1 },
      {
        header: labels.columns.vehicle,
        width: 125,
        maxLines: 3,
        value: (b) => [
          `${b.vehicle.brand} ${b.vehicle.model}`,
          `${labels.columns.plate}: ${clean(b.vehicle.plateNumber)}`,
          `${labels.fields.mileage}: ${clean(b.vehicle.mileage)} km`,
        ].join("\n"),
      },
      {
        header: labels.columns.dates,
        width: 125,
        maxLines: 2,
        value: (b) => `${formatPdfDate(b.startDate, locale)} - ${formatPdfDate(b.endDate, locale)}`,
      },
      {
        header: labels.columns.broker,
        width: 135,
        maxLines: 3,
        value: (b) => [
          fullName(b.customer?.firstName, b.customer?.lastName),
          b.customer?.phone ? `${labels.fields.phone}: ${b.customer.phone}` : "",
        ].filter(Boolean).join("\n"),
      },
      {
        header: labels.columns.driver,
        width: 135,
        maxLines: 3,
        value: (b) => [
          fullName(b.driverFirstName, b.driverLastName),
          b.driver2FirstName || b.driver2LastName || b.driver2CIN || b.driver2License
            ? `${labels.fields.secondDriver}: ${fullName(b.driver2FirstName, b.driver2LastName)}`
            : "",
        ].filter(Boolean).join("\n"),
      },
      {
        header: labels.columns.payment,
        width: 216,
        maxLines: 3,
        value: (b) => [
          `${labels.fields.total}: ${formatPdfMoney(b.invoice?.totalAmount ?? b.totalAmount ?? 0)}`,
          `${labels.fields.paid}: ${formatPdfMoney(b.invoice?.depositPaid ?? b.depositAmount ?? 0)}`,
          `${labels.fields.due}: ${formatPdfMoney(b.invoice?.amountDue ?? 0)}`,
        ].filter(Boolean).join("\n"),
      },
    ],
    activeBookings,
    labels.noRecords
  );

  pdf.heading(labels.availableCars);
  pdf.table(
    [
      { header: labels.columns.number, width: 30, value: (_row, index) => String(index + 1), maxLines: 1 },
      { header: labels.columns.vehicle, width: 260, value: (v) => `${v.brand} ${v.model}` },
      { header: labels.columns.plate, width: 140, value: (v) => v.plateNumber || "-", maxLines: 1 },
      { header: labels.columns.mileage, width: 150, value: (v) => `${(v.mileage || 0).toLocaleString()} km`, maxLines: 1 },
      { header: labels.columns.rate, width: 180, value: (v) => `${formatPdfMoney(v.dailyRate || 0)} / ${labels.fallback.perDay}` },
    ],
    availableVehicles,
    labels.noRecords
  );

  pdf.heading(labels.maintenanceCars);
  pdf.table(
    [
      { header: labels.columns.number, width: 30, value: (_row, index) => String(index + 1), maxLines: 1 },
      { header: labels.columns.vehicle, width: 170, value: (m) => `${m.vehicle.brand} ${m.vehicle.model}\n${labels.columns.plate}: ${clean(m.vehicle.plateNumber)}`, maxLines: 3 },
      { header: labels.fields.service, width: 140, value: (m) => `${formatPdfDate(m.serviceDate, locale)} - ${m.returnDate ? formatPdfDate(m.returnDate, locale) : "Open"}`, maxLines: 2 },
      { header: labels.fields.provider, width: 135, value: (m) => clean(m.serviceProvider), maxLines: 2 },
      { header: labels.columns.vehicle, width: 175, value: (m) => `${clean(m.type)}\n${clean(m.description)}`, maxLines: 4 },
      { header: labels.fields.cost, width: 110, value: (m) => formatPdfMoney(m.cost || 0), maxLines: 1 },
    ],
    activeMaintenance,
    labels.noRecords
  );

  const renderInvoiceSection = (title: string, invoices: any[]) => {
    const totalIncome = invoices.reduce((sum, invoice) => sum + ((invoice.totalAmount || 0) - (invoice.amountDue || 0)), 0);
    const totalDue = invoices.reduce((sum, invoice) => sum + (invoice.amountDue || 0), 0);

    pdf.heading(`${title} - ${labels.fields.income}: ${formatPdfMoney(totalIncome)} / ${labels.fields.due}: ${formatPdfMoney(totalDue)}`);
    pdf.table(
      [
        { header: labels.fields.invoice, width: 65, value: (invoice) => clean(invoice.id).slice(0, 8), maxLines: 1 },
        { header: labels.fields.created, width: 92, value: (invoice) => formatPdfDate(invoice.createdAt, locale), maxLines: 1 },
        { header: labels.columns.vehicle, width: 145, value: (invoice) => `${invoice.booking?.vehicle?.brand || "-"} ${invoice.booking?.vehicle?.model || ""}\n${labels.columns.plate}: ${clean(invoice.booking?.vehicle?.plateNumber)}`, maxLines: 3 },
        { header: labels.fields.customer, width: 140, value: (invoice) => fullName(invoice.booking?.customer?.firstName, invoice.booking?.customer?.lastName), maxLines: 2 },
        { header: labels.fields.total, width: 85, value: (invoice) => formatPdfMoney(invoice.totalAmount || 0), maxLines: 1 },
        { header: labels.fields.income, width: 85, value: (invoice) => formatPdfMoney((invoice.totalAmount || 0) - (invoice.amountDue || 0)), maxLines: 1 },
        { header: labels.fields.due, width: 80, value: (invoice) => formatPdfMoney(invoice.amountDue || 0), maxLines: 1 },
        { header: labels.fields.status, width: 68, value: (invoice) => labels.paymentStatuses[invoice.paymentStatus] || invoice.paymentStatus || labels.fallback.pending, maxLines: 1 },
      ],
      invoices,
      labels.noRecords
    );
  };

  renderInvoiceSection(labels.todayInvoices, todayInvoices);
  renderInvoiceSection(labels.weekInvoices, weekInvoices);

  return pdf.build();
}
