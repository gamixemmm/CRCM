import { prisma } from "@/lib/prisma";
import VignetteClient from "./VignetteClient";

export default async function VignettePage() {
  const currentYear = new Date().getFullYear();
  
  const [vehicles, vignetteExpenses] = await Promise.all([
    prisma.vehicle.findMany({
      orderBy: { plateNumber: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        category: "Vignette",
        date: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
    }),
  ]);

  return (
    <VignetteClient 
      vehicles={vehicles} 
      vignetteExpenses={vignetteExpenses} 
      currentYear={currentYear} 
    />
  );
}
