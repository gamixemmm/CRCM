import { getVehicle } from "@/actions/vehicles";
import { notFound } from "next/navigation";
import VehicleForm from "../VehicleForm";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const vehicle = await getVehicle(params.id);
  
  if (!vehicle) {
    return notFound();
  }

  return <VehicleForm vehicle={JSON.parse(JSON.stringify(vehicle))} />;
}
