import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.expense.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.globalSettings.deleteMany();

  // Create Global Settings
  await prisma.globalSettings.create({
    data: {
      id: 'global',
      cashRegister: 15000,
    },
  });

  // Create Vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        plateNumber: 'A-12345-B',
        color: 'White',
        transmission: 'Automatic',
        fuelType: 'Gasoline',
        dailyRate: 350,
        mileage: 15000,
        status: 'AVAILABLE',
        circulationDate: new Date('2023-01-15'),
        insuranceExpiry: new Date('2025-01-15'),
        registrationExpiry: new Date('2025-01-15'),
        notes: 'Excellent condition, recently serviced',
      },
    }),
    prisma.vehicle.create({
      data: {
        brand: 'Renault',
        model: 'Clio',
        year: 2022,
        plateNumber: 'B-67890-C',
        color: 'Blue',
        transmission: 'Manual',
        fuelType: 'Diesel',
        dailyRate: 280,
        mileage: 32000,
        status: 'RENTED',
        circulationDate: new Date('2022-06-10'),
        insuranceExpiry: new Date('2024-12-10'),
        registrationExpiry: new Date('2024-12-10'),
        notes: 'Popular economy car',
      },
    }),
    prisma.vehicle.create({
      data: {
        brand: 'Dacia',
        model: 'Duster',
        year: 2024,
        plateNumber: 'C-11111-D',
        color: 'Gray',
        transmission: 'Automatic',
        fuelType: 'Diesel',
        dailyRate: 450,
        mileage: 5000,
        status: 'AVAILABLE',
        circulationDate: new Date('2024-03-01'),
        insuranceExpiry: new Date('2026-03-01'),
        registrationExpiry: new Date('2026-03-01'),
        notes: 'SUV, perfect for families',
      },
    }),
    prisma.vehicle.create({
      data: {
        brand: 'Peugeot',
        model: '208',
        year: 2023,
        plateNumber: 'D-22222-E',
        color: 'Red',
        transmission: 'Manual',
        fuelType: 'Gasoline',
        dailyRate: 300,
        mileage: 18000,
        status: 'MAINTENANCE',
        circulationDate: new Date('2023-05-20'),
        insuranceExpiry: new Date('2025-05-20'),
        registrationExpiry: new Date('2025-05-20'),
        notes: 'Currently in maintenance',
      },
    }),
    prisma.vehicle.create({
      data: {
        brand: 'Mercedes',
        model: 'Class C',
        year: 2024,
        plateNumber: 'E-33333-F',
        color: 'Black',
        transmission: 'Automatic',
        fuelType: 'Diesel',
        dailyRate: 800,
        mileage: 8000,
        status: 'AVAILABLE',
        circulationDate: new Date('2024-01-10'),
        insuranceExpiry: new Date('2026-01-10'),
        registrationExpiry: new Date('2026-01-10'),
        notes: 'Luxury vehicle, premium service',
      },
    }),
  ]);

  console.log(`✅ Created ${vehicles.length} vehicles`);

  // Create Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        firstName: 'Ahmed',
        lastName: 'Benali',
        phone: '+212 6 12 34 56 78',
        email: 'ahmed.benali@email.com',
        licenseNumber: 'M123456',
        licenseExpiry: new Date('2026-08-15'),
        address: '123 Rue Mohammed V, Casablanca',
        notes: 'Regular customer, always on time',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Fatima',
        lastName: 'El Amrani',
        phone: '+212 6 98 76 54 32',
        email: 'fatima.elamrani@email.com',
        licenseNumber: 'M789012',
        licenseExpiry: new Date('2025-12-20'),
        address: '456 Avenue Hassan II, Rabat',
        notes: 'Prefers automatic transmission',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Youssef',
        lastName: 'Alaoui',
        phone: '+212 6 11 22 33 44',
        email: 'youssef.alaoui@email.com',
        licenseNumber: 'M345678',
        licenseExpiry: new Date('2027-03-10'),
        address: '789 Boulevard Zerktouni, Marrakech',
        notes: 'Business traveler',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Sophia',
        lastName: 'Martin',
        phone: '+33 6 12 34 56 78',
        email: 'sophia.martin@email.com',
        licenseNumber: 'F987654',
        licenseExpiry: new Date('2026-06-30'),
        address: '12 Rue de Paris, France',
        notes: 'Tourist, needs GPS',
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Karim',
        lastName: 'Tazi',
        phone: '+212 6 55 66 77 88',
        email: 'karim.tazi@email.com',
        licenseNumber: 'M567890',
        licenseExpiry: new Date('2025-09-15'),
        address: '321 Rue Allal Ben Abdellah, Fes',
        notes: 'VIP customer',
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // Create Bookings
  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        customerId: customers[0].id,
        vehicleId: vehicles[0].id,
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-05'),
        pickupLocation: 'Casablanca Airport',
        returnLocation: 'Casablanca Airport',
        status: 'CONFIRMED',
        totalAmount: 1400,
        depositAmount: 500,
        pricePerDay: 350,
        clientType: 'PARTICULIER',
        paymentMethod: 'CARTE',
        driverFirstName: 'Ahmed',
        driverLastName: 'Benali',
        driverCIN: 'M123456',
        driverLicense: 'M123456',
        notes: 'Airport pickup requested',
      },
    }),
    prisma.booking.create({
      data: {
        customerId: customers[1].id,
        vehicleId: vehicles[1].id,
        startDate: new Date('2026-04-20'),
        endDate: new Date('2026-04-27'),
        pickupLocation: 'Rabat Office',
        returnLocation: 'Rabat Office',
        status: 'ACTIVE',
        totalAmount: 1960,
        depositAmount: 600,
        pricePerDay: 280,
        clientType: 'PARTICULIER',
        paymentMethod: 'ESPECE',
        driverFirstName: 'Fatima',
        driverLastName: 'El Amrani',
        driverCIN: 'M789012',
        driverLicense: 'M789012',
        notes: 'Weekly rental',
      },
    }),
    prisma.booking.create({
      data: {
        customerId: customers[2].id,
        vehicleId: vehicles[2].id,
        startDate: new Date('2026-04-15'),
        endDate: new Date('2026-04-18'),
        pickupLocation: 'Marrakech Office',
        returnLocation: 'Marrakech Office',
        status: 'COMPLETED',
        totalAmount: 1350,
        depositAmount: 500,
        pricePerDay: 450,
        clientType: 'ENTREPRISE',
        companyName: 'Tech Solutions SARL',
        companyICE: '001234567890123',
        paymentMethod: 'VIREMENT',
        driverFirstName: 'Youssef',
        driverLastName: 'Alaoui',
        driverCIN: 'M345678',
        driverLicense: 'M345678',
        notes: 'Corporate booking',
      },
    }),
    prisma.booking.create({
      data: {
        customerId: customers[3].id,
        vehicleId: vehicles[4].id,
        startDate: new Date('2026-05-10'),
        endDate: new Date('2026-05-17'),
        pickupLocation: 'Casablanca Airport',
        returnLocation: 'Casablanca Airport',
        status: 'CONFIRMED',
        totalAmount: 5600,
        depositAmount: 1000,
        pricePerDay: 800,
        clientType: 'PARTICULIER',
        paymentMethod: 'CARTE',
        driverFirstName: 'Sophia',
        driverLastName: 'Martin',
        driverCIN: 'F987654',
        driverLicense: 'F987654',
        notes: 'Tourist, luxury vehicle',
      },
    }),
  ]);

  console.log(`✅ Created ${bookings.length} bookings`);

  // Create Invoices
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        bookingId: bookings[0].id,
        subtotal: 1400,
        extraCharges: 0,
        discount: 0,
        totalAmount: 1400,
        depositPaid: 500,
        amountDue: 900,
        paymentStatus: 'PARTIAL',
        notes: 'Deposit paid, balance due on return',
      },
    }),
    prisma.invoice.create({
      data: {
        bookingId: bookings[1].id,
        subtotal: 1960,
        extraCharges: 0,
        discount: 0,
        totalAmount: 1960,
        depositPaid: 600,
        amountDue: 1360,
        paymentStatus: 'PARTIAL',
        notes: 'Weekly rental discount applied',
      },
    }),
    prisma.invoice.create({
      data: {
        bookingId: bookings[2].id,
        subtotal: 1350,
        extraCharges: 150,
        extraChargeDesc: 'GPS rental',
        discount: 50,
        totalAmount: 1450,
        depositPaid: 500,
        amountDue: 0,
        paymentStatus: 'PAID',
        paidAt: new Date('2026-04-18'),
        notes: 'Fully paid, corporate account',
      },
    }),
  ]);

  console.log(`✅ Created ${invoices.length} invoices`);

  // Create Maintenance Records
  const maintenance = await Promise.all([
    prisma.maintenance.create({
      data: {
        vehicleId: vehicles[3].id,
        serviceDate: new Date('2026-04-25'),
        returnDate: new Date('2026-04-27'),
        description: 'Oil change and brake inspection',
        cost: 800,
        serviceProvider: 'Auto Service Pro',
        type: 'Entretien',
        partsUsed: ['Oil filter', 'Engine oil', 'Brake pads'],
        mileageAtService: 18000,
        notes: 'Routine maintenance',
      },
    }),
    prisma.maintenance.create({
      data: {
        vehicleId: vehicles[1].id,
        serviceDate: new Date('2026-03-15'),
        returnDate: new Date('2026-03-16'),
        description: 'Tire replacement',
        cost: 1200,
        serviceProvider: 'Tire Center',
        type: 'Réparation',
        partsUsed: ['4x Michelin tires'],
        mileageAtService: 30000,
        notes: 'All four tires replaced',
      },
    }),
    prisma.maintenance.create({
      data: {
        vehicleId: vehicles[0].id,
        serviceDate: new Date('2026-02-10'),
        returnDate: new Date('2026-02-10'),
        description: 'Annual inspection',
        cost: 500,
        serviceProvider: 'Official Toyota Service',
        type: 'Contrôle technique',
        partsUsed: [],
        mileageAtService: 14000,
        notes: 'Passed inspection',
      },
    }),
  ]);

  console.log(`✅ Created ${maintenance.length} maintenance records`);

  // Create Expenses
  const expenses = await Promise.all([
    prisma.expense.create({
      data: {
        date: new Date('2026-04-01'),
        category: 'Carburant',
        amount: 450,
        description: 'Fuel for vehicle fleet',
        vehicleId: vehicles[0].id,
      },
    }),
    prisma.expense.create({
      data: {
        date: new Date('2026-04-05'),
        category: 'Assurance',
        amount: 2500,
        description: 'Monthly insurance premium',
      },
    }),
    prisma.expense.create({
      data: {
        date: new Date('2026-04-10'),
        category: 'Entretien',
        amount: 800,
        description: 'Oil change and brake service',
        vehicleId: vehicles[3].id,
      },
    }),
    prisma.expense.create({
      data: {
        date: new Date('2026-04-15'),
        category: 'Carburant',
        amount: 380,
        description: 'Fuel refill',
        vehicleId: vehicles[1].id,
      },
    }),
    prisma.expense.create({
      data: {
        date: new Date('2026-04-20'),
        category: 'Autre',
        amount: 150,
        description: 'Office supplies',
      },
    }),
    prisma.expense.create({
      data: {
        date: new Date('2026-04-22'),
        category: 'Lavage',
        amount: 200,
        description: 'Car wash for all vehicles',
      },
    }),
  ]);

  console.log(`✅ Created ${expenses.length} expenses`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
