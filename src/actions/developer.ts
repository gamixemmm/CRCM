"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { PERMISSIONS } from "@/lib/permissions";

const developerCookieName = "crmss.developer_access";
type DemoProfile = "compact" | "standard" | "full";

function getDeveloperKey() {
  return process.env.DEVELOPER_ADMIN_KEY || "";
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function uniqueDemoSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

function getDemoCounts(profile: DemoProfile) {
  if (profile === "compact") {
    return { vehicles: 4, customers: 5, bookings: 5, expenses: 6, employees: 3 };
  }
  if (profile === "full") {
    return { vehicles: 10, customers: 12, bookings: 14, expenses: 18, employees: 7 };
  }
  return { vehicles: 7, customers: 8, bookings: 9, expenses: 12, employees: 5 };
}

function formatYearMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function isDeveloperAuthenticated() {
  const key = getDeveloperKey();
  if (!key) return false;

  const cookieStore = await cookies();
  return cookieStore.get(developerCookieName)?.value === key;
}

async function requireDeveloperAccess() {
  const allowed = await isDeveloperAuthenticated();
  if (!allowed) {
    throw new Error("Unauthorized developer access");
  }
}

export async function developerLogin(input: { accessKey: string }) {
  const key = getDeveloperKey();
  if (!key) {
    return { success: false, message: "Developer admin key is not configured." };
  }

  if (input.accessKey !== key) {
    return { success: false, message: "Invalid developer access key." };
  }

  const cookieStore = await cookies();
  cookieStore.set(developerCookieName, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return { success: true, message: "Developer access granted." };
}

export async function developerLogout() {
  const cookieStore = await cookies();
  cookieStore.set(developerCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getDeveloperCompanies() {
  await requireDeveloperAccess();

  return prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function createDeveloperCompany(input: {
  name: string;
  slug?: string;
  contactEmail?: string;
  notes?: string;
}) {
  await requireDeveloperAccess();

  const name = input.name.trim();
  const slug = normalizeSlug(input.slug || input.name);

  if (!name) {
    return { success: false, message: "Company name is required." };
  }

  if (!slug) {
    return { success: false, message: "Company slug is required." };
  }

  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing) {
    return { success: false, message: "A company with this slug already exists." };
  }

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      contactEmail: input.contactEmail?.trim() || null,
      notes: input.notes?.trim() || null,
    },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  revalidatePath("/developer");
  return { success: true, message: "Company added.", data: company };
}

export async function createDeveloperDemoCompany(input: {
  profile: DemoProfile;
  name?: string;
  slug?: string;
  adminEmail?: string;
  adminPassword?: string;
}) {
  await requireDeveloperAccess();

  const profile: DemoProfile = ["compact", "standard", "full"].includes(input.profile) ? input.profile : "standard";
  const suffix = uniqueDemoSuffix();
  const name = (input.name || `Demo Rental ${suffix.toUpperCase()}`).trim();
  const slug = normalizeSlug(input.slug || `${name}-${suffix}`);
  const adminEmail = (input.adminEmail || `demo.admin.${suffix}@example.com`).trim().toLowerCase();
  const adminPassword = input.adminPassword?.trim() || "Demo12345!";

  if (!name || !slug || !adminEmail || !adminPassword) {
    return { success: false, message: "Demo company name, slug, admin email, and password are required." };
  }

  const [existingSlug, existingEmail] = await Promise.all([
    prisma.company.findUnique({ where: { slug } }),
    prisma.companyAdmin.findUnique({ where: { email: adminEmail } }),
  ]);

  if (existingSlug) return { success: false, message: "A company with this slug already exists." };
  if (existingEmail) return { success: false, message: "This admin email is already used by another company." };

  const counts = getDemoCounts(profile);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const allPermissions = PERMISSIONS.map((permission) => permission.id);

  const vehicleSeed = [
    ["Toyota", "Corolla", 2023, "DEMO-1001", "White", "Automatic", "Gasoline", 380, 18400, "RENTED"],
    ["Dacia", "Duster", 2022, "DEMO-1002", "Gray", "Manual", "Diesel", 430, 32600, "AVAILABLE"],
    ["Hyundai", "Tucson", 2024, "DEMO-1003", "Black", "Automatic", "Diesel", 650, 9200, "RENTED"],
    ["Renault", "Clio", 2021, "DEMO-1004", "Blue", "Manual", "Gasoline", 300, 47100, "MAINTENANCE"],
    ["Mercedes", "C-Class", 2023, "DEMO-1005", "Silver", "Automatic", "Diesel", 950, 15300, "AVAILABLE"],
    ["Kia", "Sportage", 2022, "DEMO-1006", "Red", "Automatic", "Diesel", 620, 28700, "AVAILABLE"],
    ["Peugeot", "208", 2023, "DEMO-1007", "White", "Automatic", "Gasoline", 340, 21200, "AVAILABLE"],
    ["Volkswagen", "T-Roc", 2024, "DEMO-1008", "Black", "Automatic", "Gasoline", 700, 7600, "AVAILABLE"],
    ["Fiat", "500", 2021, "DEMO-1009", "Green", "Automatic", "Gasoline", 320, 39400, "AVAILABLE"],
    ["Range Rover", "Evoque", 2023, "DEMO-1010", "Navy", "Automatic", "Diesel", 1250, 14100, "AVAILABLE"],
  ];

  const customerSeed = [
    ["Ahmed", "Benali", "+212600000101", "ahmed.benali@example.com", "D-AHMED-101"],
    ["Fatima", "El Amrani", "+212600000102", "fatima.amrani@example.com", "D-FATIMA-102"],
    ["Youssef", "Alaoui", "+212600000103", "youssef.alaoui@example.com", "D-YOUSSEF-103"],
    ["Sara", "Mansouri", "+212600000104", "sara.mansouri@example.com", "D-SARA-104"],
    ["Karim", "Tazi", "+212600000105", "karim.tazi@example.com", "D-KARIM-105"],
    ["Nadia", "Berrada", "+212600000106", "nadia.berrada@example.com", "D-NADIA-106"],
    ["Omar", "Haddad", "+212600000107", "omar.haddad@example.com", "D-OMAR-107"],
    ["Imane", "Cherkaoui", "+212600000108", "imane.cherkaoui@example.com", "D-IMANE-108"],
    ["Mehdi", "Rami", "+212600000109", "mehdi.rami@example.com", "D-MEHDI-109"],
    ["Leila", "Idrissi", "+212600000110", "leila.idrissi@example.com", "D-LEILA-110"],
    ["Hicham", "Sefrioui", "+212600000111", "hicham.sefrioui@example.com", "D-HICHAM-111"],
    ["Meryem", "Fassi", "+212600000112", "meryem.fassi@example.com", "D-MERYEM-112"],
  ];

  const company = await prisma.$transaction(async (tx) => {
    const createdCompany = await tx.company.create({
      data: {
        name,
        slug,
        contactEmail: adminEmail,
        notes: `Generated ${profile} demo data. Admin password: ${adminPassword}`,
      },
    });

    await tx.companyAdmin.create({
      data: {
        companyId: createdCompany.id,
        name: "Demo Administrator",
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        active: true,
      },
    });

    await tx.globalSettings.create({
      data: {
        id: `global:${createdCompany.id}`,
        companyId: createdCompany.id,
        cashRegister: profile === "full" ? 120000 : profile === "standard" ? 75000 : 35000,
      },
    });

    const managerRole = await tx.employeeRole.create({
      data: {
        companyId: createdCompany.id,
        name: "Manager",
        permissions: allPermissions,
      },
    });
    await tx.employeeRole.create({
      data: {
        companyId: createdCompany.id,
        name: "Operations",
        permissions: [
          "VIEW_VEHICLES",
          "MANAGE_VEHICLES",
          "VIEW_BOOKINGS",
          "MANAGE_BOOKINGS",
          "VIEW_EXPENSES",
          "ADD_EXPENSE_PAYMENTS",
          "VIEW_MAINTENANCE",
          "MANAGE_MAINTENANCE",
        ],
      },
    });

    const vehicles = [];
    for (const item of vehicleSeed.slice(0, counts.vehicles)) {
      const [brand, model, year, plateNumber, color, transmission, fuelType, dailyRate, mileage, status] = item;
      vehicles.push(await tx.vehicle.create({
        data: {
          companyId: createdCompany.id,
          brand: String(brand),
          model: String(model),
          year: Number(year),
          plateNumber: String(plateNumber),
          color: String(color),
          transmission: String(transmission),
          fuelType: String(fuelType),
          dailyRate: Number(dailyRate),
          mileage: Number(mileage),
          status: String(status),
          circulationDate: addDays(now, -900),
          insuranceExpiry: addDays(now, 120),
          technicalInspectionDueDate: addDays(now, 75),
          notes: "Demo vehicle",
        },
      }));
    }

    const customers = [];
    for (const item of customerSeed.slice(0, counts.customers)) {
      const [firstName, lastName, phone, email, licenseNumber] = item;
      customers.push(await tx.customer.create({
        data: {
          companyId: createdCompany.id,
          firstName,
          lastName,
          phone,
          email,
          licenseNumber,
          licenseExpiry: addDays(now, 500),
          address: "Demo address, Casablanca",
          notes: "Demo customer",
        },
      }));
    }

    const bookingSpecs = [
      { start: -12, end: -8, status: "COMPLETED", vehicle: 1, customer: 0, paid: true },
      { start: -3, end: 4, status: "ACTIVE", vehicle: 0, customer: 1, paid: false },
      { start: 2, end: 7, status: "CONFIRMED", vehicle: 2, customer: 2, paid: false },
      { start: 9, end: 13, status: "CONFIRMED", vehicle: 4, customer: 3, paid: false },
      { start: -25, end: -20, status: "COMPLETED", vehicle: 5, customer: 4, paid: true },
      { start: 16, end: 21, status: "CONFIRMED", vehicle: 6, customer: 5, paid: false },
      { start: -5, end: 1, status: "ACTIVE", vehicle: 7, customer: 6, paid: false },
      { start: -40, end: -34, status: "COMPLETED", vehicle: 8, customer: 7, paid: true },
      { start: 22, end: 29, status: "CONFIRMED", vehicle: 9, customer: 8, paid: false },
      { start: -18, end: -14, status: "CANCELLED", vehicle: 3, customer: 9, paid: false },
      { start: 31, end: 35, status: "CONFIRMED", vehicle: 1, customer: 10, paid: false },
      { start: -60, end: -54, status: "COMPLETED", vehicle: 2, customer: 11, paid: true },
      { start: 40, end: 48, status: "CONFIRMED", vehicle: 5, customer: 0, paid: false },
      { start: -2, end: 5, status: "ACTIVE", vehicle: 6, customer: 1, paid: false },
    ];

    for (const spec of bookingSpecs.slice(0, counts.bookings)) {
      const vehicle = vehicles[spec.vehicle % vehicles.length];
      const customer = customers[spec.customer % customers.length];
      const startDate = addDays(now, spec.start);
      const endDate = addDays(now, spec.end);
      const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000));
      const totalAmount = days * vehicle.dailyRate;
      const deposit = spec.paid ? totalAmount : Math.min(totalAmount, Math.round(totalAmount * 0.3));

      const booking = await tx.booking.create({
        data: {
          companyId: createdCompany.id,
          customerId: customer.id,
          vehicleId: vehicle.id,
          startDate,
          endDate,
          pickupLocation: "Demo Casablanca Office",
          returnLocation: "Demo Casablanca Office",
          status: spec.status,
          totalAmount,
          depositAmount: deposit,
          pricePerDay: vehicle.dailyRate,
          clientType: spec.customer % 4 === 0 ? "ENTREPRISE" : "PARTICULIER",
          companyName: spec.customer % 4 === 0 ? "Demo Logistics SARL" : null,
          companyICE: spec.customer % 4 === 0 ? "001122334455667" : null,
          paymentMethod: spec.paid ? "VIREMENT" : "ESPECE",
          driverFirstName: customer.firstName,
          driverLastName: customer.lastName,
          driverCIN: customer.licenseNumber,
          driverLicense: customer.licenseNumber,
          notes: "Generated demo booking",
        },
      });

      await tx.invoice.create({
        data: {
          companyId: createdCompany.id,
          bookingId: booking.id,
          subtotal: totalAmount,
          totalAmount,
          depositPaid: deposit,
          amountDue: spec.paid ? 0 : Math.max(0, totalAmount - deposit),
          paymentStatus: spec.paid ? "PAID" : deposit > 0 ? "PARTIAL" : "PENDING",
          paidAt: spec.paid ? endDate : null,
          notes: "Generated demo invoice",
        },
      });
    }

    if (vehicles[3]) {
      await tx.maintenance.create({
        data: {
          companyId: createdCompany.id,
          vehicleId: vehicles[3].id,
          serviceDate: addDays(now, -2),
          returnDate: addDays(now, 2),
          description: "Brake inspection and oil service",
          cost: 1450,
          serviceProvider: "Demo Auto Service",
          type: "Entretien",
          partsUsed: ["Engine oil", "Brake pads"],
          mileageAtService: vehicles[3].mileage,
          notes: "Demo maintenance record",
        },
      });
    }

    for (const vehicle of vehicles.slice(0, Math.min(vehicles.length, profile === "compact" ? 2 : 5))) {
      await tx.technicalInspection.create({
        data: {
          companyId: createdCompany.id,
          vehicleId: vehicle.id,
          inspectionDate: addDays(now, -30),
          nextDueDate: addDays(now, 335),
          notes: "Demo technical inspection",
        },
      });
      await tx.vignettePayment.create({
        data: {
          companyId: createdCompany.id,
          vehicleId: vehicle.id,
          year: currentYear,
          paidAt: addDays(now, -45),
          amount: 700,
          notes: "Demo vignette payment",
        },
      });
      await tx.insurancePayment.create({
        data: {
          companyId: createdCompany.id,
          vehicleId: vehicle.id,
          paidAt: addDays(now, -60),
          endDate: addDays(now, 305),
          amount: 2800,
          notes: "Demo insurance payment",
        },
      });
    }

    for (const [index, vehicle] of vehicles.slice(0, Math.min(vehicles.length, profile === "full" ? 4 : 2)).entries()) {
      const monthlyPaidAmount = 3800 + index * 450;
      await tx.carInstallmentPayment.create({
        data: {
          companyId: createdCompany.id,
          vehicleId: vehicle.id,
          purchasePrice: 0,
          paidAmount: 0,
          monthlyPaidAmount,
          monthlyPaymentStatus: index === 0 ? "DONE" : "NOT_DONE",
          monthlyPaymentMonth: index === 0 ? currentMonth : null,
          monthlyPaymentYear: index === 0 ? currentYear : null,
        },
      });
      if (index === 0) {
        await tx.expense.create({
          data: {
            companyId: createdCompany.id,
            vehicleId: vehicle.id,
            date: now,
            category: "Car payment",
            amount: monthlyPaidAmount,
            description: `Car monthly payment - ${vehicle.brand} ${vehicle.model} - ${vehicle.plateNumber} - ${formatYearMonth(now)}`,
          },
        });
      }
    }

    const expenseSeed = [
      ["Gasoil", 520, "Fuel refill", 0],
      ["Lavage", 180, "Fleet wash", 1],
      ["Maintenance", 1450, "Brake inspection and oil service", 3],
      ["Assurance", 2800, "Insurance payment", 0],
      ["Vignette", 700, "Vignette payment", 1],
      ["Loyer", 9000, "Office rent", null],
      ["CNSS", 3200, "CNSS payment", null],
      ["Comptabilite", 2500, "Accounting payment", null],
      ["Mouvement", 900, "Driver movement payment", 2],
      ["AdBlue", 240, "AdBlue refill", 4],
      ["Gasoil", 610, "Fuel refill", 5],
      ["Autre", 350, "Office supplies", null],
      ["Lavage", 210, "Premium wash", 6],
      ["Maintenance", 860, "Tire alignment", 7],
      ["Gasoil", 470, "Fuel refill", 8],
      ["Autre", 500, "Parking fees", null],
      ["Car payment", 4300, "Car monthly payment demo", 0],
      ["Assurance", 3100, "Additional insurance payment", 9],
    ];
    for (const [index, item] of expenseSeed.slice(0, counts.expenses).entries()) {
      const [category, amount, description, vehicleIndex] = item;
      const vehicle = typeof vehicleIndex === "number" ? vehicles[vehicleIndex % vehicles.length] : null;
      await tx.expense.create({
        data: {
          companyId: createdCompany.id,
          vehicleId: vehicle?.id || null,
          date: addDays(now, -index * 3),
          category: String(category),
          amount: Number(amount),
          description: String(description),
        },
      });
    }

    const employeeSeed = [
      ["Rachid", "Kabbaj", "Fleet Manager", 9000, 1],
      ["Samira", "Naciri", "Booking Agent", 6200, 5],
      ["Adil", "Bennis", "Driver", 4800, 10],
      ["Lina", "Hamdani", "Accountant", 7000, 15],
      ["Hassan", "Moutawakil", "Mechanic", 5600, 20],
      ["Salma", "Naji", "Customer Support", 5200, 25],
      ["Anas", "Filali", "Operations", 6100, 28],
    ];
    for (const [index, item] of employeeSeed.slice(0, counts.employees).entries()) {
      const [firstName, lastName, role, salary, payDay] = item;
      const employee = await tx.employee.create({
        data: {
          companyId: createdCompany.id,
          firstName: String(firstName),
          lastName: String(lastName),
          phone: `+21260000120${index}`,
          email: `${String(firstName).toLowerCase()}.${String(lastName).toLowerCase()}@demo.local`,
          role: String(role),
          salary: Number(salary),
          payDay: Number(payDay),
          hasSalary: true,
          active: true,
          notes: "Demo employee",
        },
      });
      if (index === 0) {
        await tx.employeeAccount.create({
          data: {
            companyId: createdCompany.id,
            employeeId: employee.id,
            name: `${firstName} ${lastName}`,
            email: `manager.${suffix}@example.com`,
            passwordHash: hashPassword(adminPassword),
            active: true,
          },
        });
      }
      await tx.employeeSalaryPayment.create({
        data: {
          companyId: createdCompany.id,
          employeeId: employee.id,
          month: currentMonth,
          year: currentYear,
          amount: Number(salary),
          status: index < 2 ? "PAID" : "PENDING",
          paidAt: index < 2 ? now : null,
          notes: "Demo salary payment",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId: createdCompany.id,
        actorName: "Developer",
        action: "CREATE_DEMO_COMPANY",
        entityType: "Company",
        entityId: createdCompany.id,
        message: `Developer generated ${profile} demo company ${createdCompany.name}`,
        metadata: { profile, vehicles: counts.vehicles, customers: counts.customers, bookings: counts.bookings },
      },
    });

    return createdCompany;
  }, { timeout: 30_000 });

  revalidatePath("/developer");
  return {
    success: true,
    message: `Demo company created. Login: ${adminEmail} / ${adminPassword}`,
    data: { companyId: company.id, slug, adminEmail, adminPassword },
  };
}

export async function upsertDeveloperCompanyAdmin(input: {
  companyId: string;
  name: string;
  email: string;
  password?: string;
  active: boolean;
}) {
  await requireDeveloperAccess();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password?.trim() || "";

  if (!name || !email) {
    return { success: false, message: "Admin name and email are required." };
  }

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    include: { admin: true },
  });

  if (!company) {
    return { success: false, message: "Company not found." };
  }

  if (!company.admin && !password) {
    return { success: false, message: "Password is required when creating an admin account." };
  }

  const existingEmail = await prisma.companyAdmin.findUnique({ where: { email } });
  if (existingEmail && existingEmail.companyId !== input.companyId) {
    return { success: false, message: "This admin email is already used by another company." };
  }

  const passwordData = password ? { passwordHash: hashPassword(password) } : {};
  const admin = company.admin
    ? await prisma.companyAdmin.update({
        where: { companyId: input.companyId },
        data: {
          name,
          email,
          active: input.active,
          ...passwordData,
        },
      })
    : await prisma.companyAdmin.create({
        data: {
          companyId: input.companyId,
          name,
          email,
          active: input.active,
          passwordHash: hashPassword(password),
        },
      });

  revalidatePath("/developer");
  return { success: true, message: "Company admin account saved.", data: admin };
}

export async function setDeveloperCompanyAdminActive(companyId: string, active: boolean) {
  await requireDeveloperAccess();

  const admin = await prisma.companyAdmin.update({
    where: { companyId },
    data: { active },
  });

  revalidatePath("/developer");
  return {
    success: true,
    message: active ? "Company admin enabled." : "Company admin disabled.",
    data: admin,
  };
}

export async function setDeveloperCompanyActive(companyId: string, active: boolean) {
  await requireDeveloperAccess();

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      active,
      disabledAt: active ? null : new Date(),
    },
  });

  revalidatePath("/developer");
  return {
    success: true,
    message: active ? "Company enabled." : "Company disabled.",
    data: company,
  };
}
