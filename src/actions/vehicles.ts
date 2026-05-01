"use server";

import { inflateSync } from "node:zlib";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCompanyId } from "@/lib/company";
import { canPerform } from "@/lib/permissions";
import { requireCompanyAdminAccess } from "@/actions/companyAuth";
import { logAuditAction } from "@/lib/audit";

// ─── Types ───────────────────────────────────────────────────────
interface VehicleInput {
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color?: string;
  transmission?: string;
  fuelType?: string;
  dailyRate: number;
  mileage?: number;
  status?: string;
  imageUrl?: string;
  circulationDate?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  technicalInspectionDueDate?: string;
  notes?: string;
}

interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: Record<string, string[]>;
}

type ImportedVehicle = {
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  fuelType: string;
  transmission: string;
  power?: string;
};

const PDF_FUEL_VALUES = new Set(["DIESEL", "ESSENCE", "HYBRIDE", "HYBRID", "GASOLINE"]);

function normalizeImportCell(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string) {
  return normalizeImportCell(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();
}

function normalizeFuelType(value: string) {
  const fuel = normalizeHeader(value);
  if (fuel === "ESSENCE" || fuel === "GASOLINE") return "Gasoline";
  if (fuel === "HYBRIDE" || fuel === "HYBRID") return "Hybrid";
  if (fuel === "ELECTRIC" || fuel === "ELECTRIQUE") return "Electric";
  return "Diesel";
}

function normalizeBrand(value: string) {
  const brand = normalizeImportCell(value).toUpperCase();
  const fixes: Record<string, string> = {
    RENALUT: "RENAULT",
    RENAULT: "RENAULT",
    VOLKSWAGEN: "VOLKSWAGEN",
    RANGEROVER: "RANGE ROVER",
  };
  return fixes[brand.replace(/\s+/g, "")] || fixes[brand] || brand || "UNKNOWN";
}

function normalizeModel(value: string) {
  return normalizeImportCell(value)
    .toUpperCase()
    .replace(/CLIO(\d)/g, "CLIO $1")
    .replace(/([A-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Z])/g, "$1 $2")
    .replace(/MANUELE/g, " MANUELE")
    .replace(/AUTOMATIQUE/g, " AUTOMATIQUE")
    .replace(/\s+/g, " ")
    .trim();
}

function transmissionFromModel(model: string) {
  const normalized = normalizeHeader(model);
  if (normalized.includes("MANUELE") || normalized.includes("MANUAL")) return "Manual";
  return "Automatic";
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(normalizeImportCell(current));
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(normalizeImportCell(current));
  return cells;
}

function parseDelimitedVehicles(text: string): ImportedVehicle[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const headerIndex = (names: string[]) => headers.findIndex((header) => names.includes(header));

  const indexes = {
    fuel: headerIndex(["CARBURANT", "FUEL", "FUELTYPE"]),
    power: headerIndex(["PUISSANCE", "POWER"]),
    year: headerIndex(["ANNES", "ANNEES", "YEAR"]),
    plate: headerIndex(["IMMATRUCATION", "IMMATRICULATION", "PLATE", "PLATENUMBER"]),
    model: headerIndex(["VOITURES", "VOITURE", "MODEL", "MODELE"]),
    brand: headerIndex(["MARQUE", "BRAND"]),
  };

  if (indexes.fuel < 0 || indexes.year < 0 || indexes.plate < 0 || indexes.model < 0) {
    return [];
  }

  let currentBrand = "";
  return lines.slice(1).flatMap((line) => {
    const cells = parseCsvLine(line, delimiter);
    const brandCell = indexes.brand >= 0 ? normalizeImportCell(cells[indexes.brand] || "") : "";
    if (brandCell) currentBrand = normalizeBrand(brandCell);

    const model = normalizeModel(cells[indexes.model] || "");
    const year = Number.parseInt(cells[indexes.year] || "", 10);
    const plateNumber = normalizeImportCell(cells[indexes.plate] || "").toUpperCase();
    if (!model || !year || !plateNumber) return [];

    return [{
      brand: currentBrand || "UNKNOWN",
      model,
      year,
      plateNumber,
      fuelType: normalizeFuelType(cells[indexes.fuel] || ""),
      transmission: transmissionFromModel(model),
      power: indexes.power >= 0 ? normalizeImportCell(cells[indexes.power] || "") : undefined,
    }];
  });
}

function extractPdfCells(buffer: Buffer) {
  const pdf = buffer.toString("latin1");
  const cells: string[] = [];
  let position = 0;

  while ((position = pdf.indexOf("stream", position)) !== -1) {
    let start = position + "stream".length;
    if (pdf[start] === "\r" && pdf[start + 1] === "\n") start += 2;
    else if (pdf[start] === "\n") start += 1;

    const end = pdf.indexOf("endstream", start);
    if (end < 0) break;

    let streamEnd = end;
    while (streamEnd > start && (buffer[streamEnd - 1] === 10 || buffer[streamEnd - 1] === 13)) {
      streamEnd--;
    }

    try {
      const inflated = inflateSync(buffer.subarray(start, streamEnd)).toString("latin1");
      let current = "";
      for (const match of inflated.matchAll(/\((?:\\.|[^\\()])*\)/g)) {
        const value = match[0]
          .slice(1, -1)
          .replace(/\\([nrtbf()\\])/g, (_, char: string) => {
            const escapes: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
            return escapes[char] || char;
          });

        if (!value.trim()) continue;
        if (value === "ar-SA") {
          if (current) {
            cells.push(normalizeImportCell(current));
            current = "";
          }
        } else {
          current += value;
        }
      }
      if (current) cells.push(normalizeImportCell(current));
    } catch {
      // Non-compressed streams and embedded fonts are ignored.
    }

    position = end + "endstream".length;
  }

  return cells;
}

function parsePdfVehicles(buffer: Buffer): ImportedVehicle[] {
  const cells = extractPdfCells(buffer);
  const headerIndex = cells.findIndex((cell) => normalizeHeader(cell) === "CARBURANT");
  if (headerIndex < 0) return [];

  const rows: ImportedVehicle[] = [];
  let currentBrand = "";
  let index = headerIndex + 5;

  while (index < cells.length) {
    const fuel = normalizeHeader(cells[index] || "");
    if (!PDF_FUEL_VALUES.has(fuel)) {
      index++;
      continue;
    }

    const power = normalizeImportCell(cells[index + 1] || "");
    const year = Number.parseInt(cells[index + 2] || "", 10);
    const plateNumber = normalizeImportCell(cells[index + 3] || "").toUpperCase();
    const model = normalizeModel(cells[index + 4] || "");
    index += 5;

    const maybeBrand = normalizeImportCell(cells[index] || "");
    if (maybeBrand && !PDF_FUEL_VALUES.has(normalizeHeader(maybeBrand))) {
      currentBrand = normalizeBrand(maybeBrand);
      index++;
    }

    if (!year || !plateNumber || !model) continue;

    rows.push({
      brand: currentBrand || "UNKNOWN",
      model,
      year,
      plateNumber,
      fuelType: normalizeFuelType(fuel),
      transmission: transmissionFromModel(model),
      power,
    });
  }

  return rows;
}

function parseVehicleImportFile(fileName: string, mimeType: string, buffer: Buffer) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    return parsePdfVehicles(buffer);
  }

  return parseDelimitedVehicles(buffer.toString("utf8"));
}

// ─── Get All Vehicles ────────────────────────────────────────────
export async function getVehicles(params?: {
  status?: string;
  search?: string;
}) {
  const companyId = await requireCompanyId();
  const where: Record<string, unknown> = {};
  where.companyId = companyId;

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params?.search) {
    where.OR = [
      { brand: { contains: params.search } },
      { model: { contains: params.search } },
      { plateNumber: { contains: params.search } },
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        where: { status: "ACTIVE" },
        take: 1,
        select: { id: true },
      },
      _count: {
        select: { bookings: true },
      },
      maintenance: {
        where: { type: "Vidange" },
        orderBy: { serviceDate: "desc" },
        take: 1,
      }
    },
  });


  return vehicles;
}

// ─── Get All Vehicles With Their Bookings (for booking calendar) ──
export async function getVehiclesWithBookings() {
  const companyId = await requireCompanyId();
  const vehicles = await prisma.vehicle.findMany({
    where: {
      companyId,
      status: { not: "MAINTENANCE" },
    },
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        where: {
          status: { in: ["CONFIRMED", "ACTIVE"] },
        },
        select: {
          startDate: true,
          endDate: true,
          status: true,
        },
      },
      insurancePayments: {
        orderBy: { paidAt: "desc" },
        take: 1,
        select: {
          endDate: true,
        },
      },
      technicalInspections: {
        orderBy: { inspectionDate: "desc" },
        take: 1,
        select: {
          nextDueDate: true,
        },
      },
      vignettePayments: {
        select: {
          year: true,
        },
      },
      expenses: {
        where: {
          category: "Vignette",
        },
        select: {
          date: true,
        },
      },
    },
  });

  return vehicles;
}

// ─── Get All Vehicles With Their Bookings (for maintenance calendar) ──
export async function getVehiclesForMaintenance() {
  const companyId = await requireCompanyId();
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        where: {
          status: { in: ["CONFIRMED", "ACTIVE"] },
        },
        select: {
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  });

  return vehicles;
}

// ─── Get Single Vehicle ──────────────────────────────────────────
export async function getVehicle(id: string) {
  const companyId = await requireCompanyId();
  return prisma.vehicle.findFirst({
    where: { id, companyId },
    include: {
      bookings: {
        orderBy: { startDate: "desc" },
        take: 10,
        include: { customer: true },
      },
      maintenance: {
        orderBy: { serviceDate: "desc" },
        take: 10,
      },
    },
  });
}

// ─── Create Vehicle ──────────────────────────────────────────────
export async function createVehicle(input: VehicleInput): Promise<ActionResult> {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_VEHICLES"])) {
      return { success: false, message: "You do not have permission to add vehicles." };
    }
    const companyId = await requireCompanyId();
    // Validate required fields
    if (!input.brand || !input.model || !input.plateNumber) {
      return {
        success: false,
        message: "Please fill in all required fields",
        errors: {
          ...((!input.brand) && { brand: ["Brand is required"] }),
          ...((!input.model) && { model: ["Model is required"] }),
          ...((!input.plateNumber) && { plateNumber: ["Plate number is required"] }),
        },
      };
    }

    // Check plate uniqueness
    const existing = await prisma.vehicle.findUnique({
      where: { companyId_plateNumber: { companyId, plateNumber: input.plateNumber.toUpperCase().trim() } },
    });

    if (existing) {
      return {
        success: false,
        message: "A vehicle with this plate number already exists",
        errors: { plateNumber: ["Plate number must be unique"] },
      };
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        brand: input.brand.trim(),
        model: input.model.trim(),
        year: input.year,
        plateNumber: input.plateNumber.toUpperCase().trim(),
        color: input.color || "Black",
        transmission: input.transmission || "Automatic",
        fuelType: input.fuelType || "Gasoline",
        dailyRate: input.dailyRate || 0,
        mileage: input.mileage || 0,
        status: input.status || "AVAILABLE",
        companyId,
        imageUrl: input.imageUrl || null,
        circulationDate: input.circulationDate ? new Date(input.circulationDate) : null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        registrationExpiry: input.registrationExpiry ? new Date(input.registrationExpiry) : null,
        technicalInspectionDueDate: input.technicalInspectionDueDate ? new Date(input.technicalInspectionDueDate) : null,
        notes: input.notes || null,
      },
    });

    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "CREATE_VEHICLE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      message: `${session.name} created vehicle ${vehicle.plateNumber}`,
    });

    return { success: true, message: "Vehicle added successfully", data: vehicle };
  } catch (error) {
    console.error("Create vehicle error:", error);
    return { success: false, message: "Failed to add vehicle" };
  }
}

// ─── Update Vehicle ──────────────────────────────────────────────
// Import vehicles from the car list format: CARBURANT, PUISSANCE, ANNES, IMMATRUCATION, VOITURES.
export async function importVehicles(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["ADD_VEHICLES"])) {
      return { success: false, message: "You do not have permission to add vehicles." };
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return { success: false, message: "Please choose a vehicle import file." };
    }

    const companyId = await requireCompanyId();
    const buffer = Buffer.from(await file.arrayBuffer());
    const importedRows = parseVehicleImportFile(file.name, file.type, buffer);

    if (importedRows.length === 0) {
      return {
        success: false,
        message: "No vehicles found. Use the car list format: CARBURANT, PUISSANCE, ANNES, IMMATRUCATION, VOITURES.",
      };
    }

    const uniqueRows = new Map<string, ImportedVehicle>();
    for (const row of importedRows) {
      if (row.plateNumber) uniqueRows.set(row.plateNumber, row);
    }

    const plates = Array.from(uniqueRows.keys());
    const existing = await prisma.vehicle.findMany({
      where: { companyId, plateNumber: { in: plates } },
      select: { plateNumber: true },
    });
    const existingPlates = new Set(existing.map((vehicle) => vehicle.plateNumber));

    let created = 0;
    let failed = 0;
    for (const row of uniqueRows.values()) {
      if (existingPlates.has(row.plateNumber)) continue;

      try {
        await prisma.vehicle.create({
          data: {
            brand: row.brand,
            model: row.model,
            year: row.year,
            plateNumber: row.plateNumber,
            color: "Black",
            transmission: row.transmission,
            fuelType: row.fuelType,
            dailyRate: 0,
            mileage: 0,
            status: "AVAILABLE",
            companyId,
            notes: row.power ? `Puissance: ${row.power}` : null,
          },
        });
        created++;
      } catch (error) {
        console.error("Import vehicle row error:", error);
        failed++;
      }
    }

    revalidatePath("/vehicles");
    revalidatePath("/");

    if (created > 0) {
      await logAuditAction({
        actor: session,
        action: "IMPORT_VEHICLES",
        entityType: "Vehicle",
        message: `${session.name} imported ${created} vehicles`,
      });
    }

    const skipped = uniqueRows.size - created - failed;
    return {
      success: failed === 0,
      message: `Imported ${created} vehicles. Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}${failed ? `; ${failed} failed` : ""}.`,
      data: { created, skipped, failed },
    };
  } catch (error) {
    console.error("Import vehicles error:", error);
    return { success: false, message: "Failed to import vehicles" };
  }
}

export async function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<ActionResult> {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_VEHICLES"])) {
      return { success: false, message: "You do not have permission to manage vehicles." };
    }
    const companyId = await requireCompanyId();
    // Check plate uniqueness if changing
    if (input.plateNumber) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          companyId,
          plateNumber: input.plateNumber.toUpperCase().trim(),
          id: { not: id },
        },
      });
      if (existing) {
        return {
          success: false,
          message: "A vehicle with this plate number already exists",
        };
      }
    }

    const data: Record<string, unknown> = {};
    if (input.brand !== undefined) data.brand = input.brand.trim();
    if (input.model !== undefined) data.model = input.model.trim();
    if (input.year !== undefined) data.year = input.year;
    if (input.plateNumber !== undefined) data.plateNumber = input.plateNumber.toUpperCase().trim();
    if (input.color !== undefined) data.color = input.color;
    if (input.transmission !== undefined) data.transmission = input.transmission;
    if (input.fuelType !== undefined) data.fuelType = input.fuelType;
    if (input.dailyRate !== undefined) data.dailyRate = input.dailyRate;
    if (input.mileage !== undefined) data.mileage = input.mileage;
    if (input.status !== undefined) data.status = input.status;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl || null;
    if (input.circulationDate !== undefined) data.circulationDate = input.circulationDate ? new Date(input.circulationDate) : null;
    if (input.insuranceExpiry !== undefined) data.insuranceExpiry = input.insuranceExpiry ? new Date(input.insuranceExpiry) : null;
    if (input.registrationExpiry !== undefined) data.registrationExpiry = input.registrationExpiry ? new Date(input.registrationExpiry) : null;
    if (input.technicalInspectionDueDate !== undefined) data.technicalInspectionDueDate = input.technicalInspectionDueDate ? new Date(input.technicalInspectionDueDate) : null;
    if (input.notes !== undefined) data.notes = input.notes || null;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data,
    });

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${id}`);
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "UPDATE_VEHICLE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      message: `${session.name} updated vehicle ${vehicle.plateNumber}`,
    });

    return { success: true, message: "Vehicle updated successfully", data: vehicle };
  } catch (error) {
    console.error("Update vehicle error:", error);
    return { success: false, message: "Failed to update vehicle" };
  }
}

// ─── Delete Vehicle ──────────────────────────────────────────────
export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    const session = await requireCompanyAdminAccess();
    if (!canPerform(session, ["MANAGE_VEHICLES"])) {
      return { success: false, message: "You do not have permission to manage vehicles." };
    }
    const companyId = await requireCompanyId();
    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        companyId,
        vehicleId: id,
        status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      },
    });

    if (activeBookings > 0) {
      return {
        success: false,
        message: "Cannot delete vehicle with active bookings",
      };
    }

    const vehicle = await prisma.vehicle.delete({ where: { id } });

    revalidatePath("/vehicles");
    revalidatePath("/");
    await logAuditAction({
      actor: session,
      action: "DELETE_VEHICLE",
      entityType: "Vehicle",
      entityId: id,
      message: `${session.name} deleted vehicle ${vehicle.plateNumber}`,
    });

    return { success: true, message: "Vehicle deleted successfully" };
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return { success: false, message: "Failed to delete vehicle" };
  }
}

// ─── Get Vehicle Stats ───────────────────────────────────────────
export async function getVehicleStats() {
  const companyId = await requireCompanyId();
  const [total, available, rented, maintenance] = await Promise.all([
    prisma.vehicle.count({ where: { companyId } }),
    prisma.vehicle.count({ where: { companyId, status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { companyId, status: "RENTED" } }),
    prisma.vehicle.count({ where: { companyId, status: "MAINTENANCE" } }),
  ]);

  return { total, available, rented, maintenance };
}
