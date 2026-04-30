"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Gauge, Plus, Save, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Textarea } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import BookingCalendar from "@/components/ui/BookingCalendar";
import { useToast } from "@/components/ui/Toast";
import { logMaintenance } from "@/actions/maintenance";
import { useSettings } from "@/lib/SettingsContext";
import { makeMaintenanceCostEntry, makeMaintenanceDetailEntry } from "@/lib/maintenanceDetails";
import type { TranslationKey } from "@/lib/translations";
import styles from "./MaintenanceForm.module.css";

type OtherService = {
  id: string;
  name: string;
  price: number | "";
};

const createOtherService = (): OtherService => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: "",
  price: "",
});

const MAINTENANCE_VALUE_KEYS: Record<string, TranslationKey> = {
  "Vidange": "maintenance.value.oilChange",
  "Changement des pneus": "maintenance.value.tireChange",
  "Plaquettes de frein (avant / arriÃ¨re)": "maintenance.value.brakePads",
  "Disques de frein": "maintenance.value.brakeDiscs",
  "Ã‰quilibrage & parallÃ©lisme": "maintenance.value.alignment",
  "RÃ©paration aprÃ¨s accident": "maintenance.value.accidentRepair",
  "Autre": "maintenance.value.other",
  "Filtres changÃ©s": "maintenance.value.changedFilters",
  "Pneus changÃ©s": "maintenance.value.changedTires",
  "Roues concernÃ©es": "maintenance.value.affectedWheels",
  "Disques changÃ©s": "maintenance.value.changedDiscs",
  "Ã‰lÃ©ments Ã  rÃ©parer": "maintenance.value.itemsToRepair",
  "Filtre Ã  huile": "maintenance.value.oilFilter",
  "Filtre diesel": "maintenance.value.dieselFilter",
  "Filtre Ã  air": "maintenance.value.airFilter",
  "Filtre habitacle": "maintenance.value.cabinFilter",
  "Pneu avant gauche": "maintenance.value.frontLeftTire",
  "Pneu avant droit": "maintenance.value.frontRightTire",
  "Pneu arriÃ¨re gauche": "maintenance.value.rearLeftTire",
  "Pneu arriÃ¨re droit": "maintenance.value.rearRightTire",
  "Roue avant gauche": "maintenance.value.frontLeftWheel",
  "Roue avant droite": "maintenance.value.frontRightWheel",
  "Roue arriÃ¨re gauche": "maintenance.value.rearLeftWheel",
  "Roue arriÃ¨re droite": "maintenance.value.rearRightWheel",
  "Disque avant gauche": "maintenance.value.frontLeftDisc",
  "Disque avant droit": "maintenance.value.frontRightDisc",
  "Disque arriÃ¨re gauche": "maintenance.value.rearLeftDisc",
  "Disque arriÃ¨re droit": "maintenance.value.rearRightDisc",
  "Pare-chocs avant": "maintenance.value.frontBumper",
  "Pare-chocs arriÃ¨re": "maintenance.value.rearBumper",
  "Aile avant gauche": "maintenance.value.frontLeftFender",
  "Aile avant droite": "maintenance.value.frontRightFender",
  "Aile arriÃ¨re gauche": "maintenance.value.rearLeftFender",
  "Aile arriÃ¨re droite": "maintenance.value.rearRightFender",
  "Capot": "maintenance.value.hood",
  "Coffre": "maintenance.value.trunk",
  "PortiÃ¨re gauche": "maintenance.value.leftDoor",
  "PortiÃ¨re droite": "maintenance.value.rightDoor",
  "Phare avant": "maintenance.value.headlight",
  "Feu arriÃ¨re": "maintenance.value.tailLight",
  "RÃ©troviseur": "maintenance.value.mirror",
  "Pare-brise": "maintenance.value.windshield",
  "Radiateur": "maintenance.value.radiator",
  "Suspension": "maintenance.value.suspension",
  "Jante": "maintenance.value.rim",
  "Peinture": "maintenance.value.paint",
  "Plaquettes de frein (avant / arrière)": "maintenance.value.brakePads",
  "Équilibrage & parallélisme": "maintenance.value.alignment",
  "Réparation après accident": "maintenance.value.accidentRepair",
  "Filtres changés": "maintenance.value.changedFilters",
  "Pneus changés": "maintenance.value.changedTires",
  "Roues concernées": "maintenance.value.affectedWheels",
  "Disques changés": "maintenance.value.changedDiscs",
  "Éléments à réparer": "maintenance.value.itemsToRepair",
  "Filtre à huile": "maintenance.value.oilFilter",
  "Filtre à air": "maintenance.value.airFilter",
  "Pneu arrière gauche": "maintenance.value.rearLeftTire",
  "Pneu arrière droit": "maintenance.value.rearRightTire",
  "Roue arrière gauche": "maintenance.value.rearLeftWheel",
  "Roue arrière droite": "maintenance.value.rearRightWheel",
  "Disque arrière gauche": "maintenance.value.rearLeftDisc",
  "Disque arrière droit": "maintenance.value.rearRightDisc",
  "Pare-chocs arrière": "maintenance.value.rearBumper",
  "Aile arrière gauche": "maintenance.value.rearLeftFender",
  "Aile arrière droite": "maintenance.value.rearRightFender",
  "Portière gauche": "maintenance.value.leftDoor",
  "Portière droite": "maintenance.value.rightDoor",
  "Feu arrière": "maintenance.value.tailLight",
  "Rétroviseur": "maintenance.value.mirror",
};

export default function MaintenanceForm({
  vehicles,
  serviceProviders = [],
}: {
  vehicles: any[];
  serviceProviders?: string[];
}) {
  const router = useRouter();
  const { currency, t } = useSettings();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [providerMode, setProviderMode] = useState<"existing" | "new">(
    serviceProviders.length > 0 ? "existing" : "new"
  );
  const [mileageModalOpen, setMileageModalOpen] = useState(false);
  const [mileageDraft, setMileageDraft] = useState("");
  const [mileageError, setMileageError] = useState("");
  const [newAccidentRepairItem, setNewAccidentRepairItem] = useState("");
  const [otherServices, setOtherServices] = useState<OtherService[]>([]);
  const [renderedDetailTypes, setRenderedDetailTypes] = useState<string[]>([]);
  const [exitingDetailTypes, setExitingDetailTypes] = useState<string[]>([]);
  const exitingDetailTypesRef = useRef(new Set<string>());
  const exitTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  
  const [form, setForm] = useState({
    vehicleId: "",
    serviceDate: new Date().toISOString().split("T")[0],
    returnDate: "",
    description: "",
    cost: 0,
    serviceProvider: "",
    notes: "",
    types: [] as string[],
    interventionDetails: {} as Record<string, string[]>,
    interventionCosts: {} as Record<string, number>,
    partsUsed: [] as string[],
  });

  const MAINTENANCE_TYPES = [
    "Vidange",
    "Changement des pneus",
    "Plaquettes de frein (avant / arrière)",
    "Disques de frein",
    "Équilibrage & parallélisme",
    "Réparation après accident",
    "Autre"
  ];

  const PARTS = [
    "Filtre à huile",
    "Filtre diesel",
    "Filtre à air",
    "Filtre habitacle"
  ];

  const INTERVENTION_DETAILS: Record<string, { title: string; options: string[] }> = {
    Vidange: {
      title: "Filtres changés",
      options: PARTS,
    },
    "Changement des pneus": {
      title: "Pneus changés",
      options: [
        "Pneu avant gauche",
        "Pneu avant droit",
        "Pneu arrière gauche",
        "Pneu arrière droit",
      ],
    },
    "Plaquettes de frein (avant / arrière)": {
      title: "Roues concernées",
      options: [
        "Roue avant gauche",
        "Roue avant droite",
        "Roue arrière gauche",
        "Roue arrière droite",
      ],
    },
  };

  INTERVENTION_DETAILS["Disques de frein"] = {
    title: "Disques changés",
    options: [
      "Disque avant gauche",
      "Disque avant droit",
      "Disque arrière gauche",
      "Disque arrière droit",
    ],
  };

  INTERVENTION_DETAILS["Équilibrage & parallélisme"] = {
    title: "Roues concernées",
    options: [
      "Roue avant gauche",
      "Roue avant droite",
      "Roue arrière gauche",
      "Roue arrière droite",
    ],
  };

  INTERVENTION_DETAILS["Réparation après accident"] = {
    title: "Éléments à réparer",
    options: [
      "Pare-chocs avant",
      "Pare-chocs arrière",
      "Aile avant gauche",
      "Aile avant droite",
      "Aile arrière gauche",
      "Aile arrière droite",
      "Capot",
      "Coffre",
      "Portière gauche",
      "Portière droite",
      "Phare avant",
      "Feu arrière",
      "Rétroviseur",
      "Pare-brise",
      "Radiateur",
      "Suspension",
      "Jante",
      "Peinture",
    ],
  };

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const selectedInterventionDetails = form.types.flatMap((type) =>
    (form.interventionDetails[type] || []).map((detail) => makeMaintenanceDetailEntry(type, detail))
  );
  const interventionCostEntries = Object.entries(form.interventionCosts).filter(([, cost]) => cost > 0);
  const validOtherServices = otherServices
    .map((service) => ({
      ...service,
      name: service.name.trim(),
      price: Number(service.price),
    }))
    .filter((service) => service.name && Number.isFinite(service.price) && service.price > 0);
  const otherServiceTotal = validOtherServices.reduce((total, service) => total + service.price, 0);
  const interventionCostTotal = interventionCostEntries.reduce((total, [, cost]) => total + cost, 0) + otherServiceTotal;
  const selectedInterventionCosts = interventionCostEntries.map(([type, cost]) => makeMaintenanceCostEntry(type, cost));
  const selectedOtherServiceCosts = validOtherServices.map((service) =>
    makeMaintenanceCostEntry(`Autre - ${service.name}`, service.price)
  );
  const currentMileage = selectedVehicle?.mileage || 0;
  const maintenanceLabel = (value: string) => {
    const key = MAINTENANCE_VALUE_KEYS[value];
    return key ? t(key) : value;
  };

  const buildPayload = (mileageAtService: number) => ({
    ...form,
    type: form.types.join(", "),
    description: form.types.join(", "),
    cost: interventionCostTotal > 0 ? interventionCostTotal : form.cost,
    returnDate: form.returnDate || undefined,
    serviceProvider: form.serviceProvider.trim() || undefined,
    partsUsed: [...form.partsUsed, ...selectedInterventionDetails, ...selectedInterventionCosts, ...selectedOtherServiceCosts],
    mileageAtService,
  });

  useEffect(() => {
    const activeDetailTypes = form.types.filter((type) => INTERVENTION_DETAILS[type]);
    const activeDetailTypeSet = new Set(activeDetailTypes);

    setRenderedDetailTypes((current) => {
      const next = [...current];

      activeDetailTypes.forEach((type) => {
        const exitTimer = exitTimersRef.current[type];
        if (exitTimer) {
          clearTimeout(exitTimer);
          delete exitTimersRef.current[type];
        }

        exitingDetailTypesRef.current.delete(type);
        if (!next.includes(type)) next.push(type);
      });

      next
        .filter((type) => !activeDetailTypeSet.has(type) && !exitingDetailTypesRef.current.has(type))
        .forEach((type) => {
          exitingDetailTypesRef.current.add(type);
          exitTimersRef.current[type] = setTimeout(() => {
            exitingDetailTypesRef.current.delete(type);
            delete exitTimersRef.current[type];
            setRenderedDetailTypes((latest) => latest.filter((item) => item !== type));
            setExitingDetailTypes(Array.from(exitingDetailTypesRef.current));
          }, 220);
        });

      setExitingDetailTypes(Array.from(exitingDetailTypesRef.current));
      return next;
    });
  }, [form.types]);

  useEffect(() => {
    return () => {
      Object.values(exitTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId || !form.serviceDate || form.types.length === 0) {
      toast(t("maintenance.fillRequired"), "error");
      return;
    }

    setMileageDraft(String(currentMileage));
    setMileageError("");
    setMileageModalOpen(true);
  };

  const handleConfirmMileage = async () => {
    const newMileage = Number(mileageDraft);

    if (!Number.isFinite(newMileage) || newMileage < currentMileage) {
      setMileageError(t("toast.mileageError"));
      return;
    }

    setLoading(true);

    const result = await logMaintenance(buildPayload(newMileage));
    setLoading(false);

    if (result.success) {
      setMileageModalOpen(false);
      toast(t("maintenance.successMsg"), "success");
      router.push("/maintenance");
    } else {
      toast(result.message, "error");
    }
  };

  const serviceProviderField = (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>
        {t("maintenance.shopName")}
      </label>
      <div style={{ display: "flex", gap: "6px", padding: "3px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "8px" }}>
        <button
          type="button"
          onClick={() => setProviderMode("existing")}
          disabled={serviceProviders.length === 0}
          style={{
            flex: 1,
            height: "32px",
            border: "0",
            borderRadius: "6px",
            background: providerMode === "existing" ? "var(--accent-muted)" : "transparent",
            color: providerMode === "existing" ? "var(--accent)" : "var(--text-secondary)",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: serviceProviders.length === 0 ? "not-allowed" : "pointer",
            opacity: serviceProviders.length === 0 ? 0.5 : 1,
          }}
        >
          {t("maintenance.existingProvider")}
        </button>
        <button
          type="button"
          onClick={() => {
            setProviderMode("new");
            setForm({ ...form, serviceProvider: "" });
          }}
          style={{
            flex: 1,
            height: "32px",
            border: "0",
            borderRadius: "6px",
            background: providerMode === "new" ? "var(--accent-muted)" : "transparent",
            color: providerMode === "new" ? "var(--accent)" : "var(--text-secondary)",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("maintenance.addNewProvider")}
        </button>
      </div>
      {providerMode === "existing" ? (
        <Select
          value={form.serviceProvider}
          onChange={(e) => setForm({ ...form, serviceProvider: e.target.value })}
          options={serviceProviders.map((provider) => ({
            value: provider,
            label: provider,
          }))}
          placeholder={t("maintenance.selectServiceProvider")}
        />
      ) : (
        <Input
          value={form.serviceProvider}
          onChange={(e) => setForm({ ...form, serviceProvider: e.target.value })}
          placeholder={t("maintenance.enterServiceProvider")}
        />
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>{t("maintenance.logTask")}</h1>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          {t("action.back")}
        </Button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "24px", flexDirection: "column", maxWidth: "1120px" }}>
        
        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("maintenance.selectVehicle")}</h3>
          <div className={styles.shopVehicleLayout}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Select
                label={t("maintenance.vehicleReg")}
                required
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                options={vehicles.map((v) => ({ 
                  value: v.id, 
                  label: `[${v.status}] ${v.plateNumber} ${v.brand} ${v.model}` 
                }))}
                placeholder={t("maintenance.vehiclePlaceholder")}
              />

              {serviceProviderField}
              
              {selectedVehicle ? (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    {t("maintenance.serviceDate")} & {t("bookings.returnDate")}
                  </label>
                  <BookingCalendar
                    bookedRanges={selectedVehicle.bookings || []}
                    startDate={form.serviceDate}
                    endDate={form.returnDate}
                    mode="range"
                    allowBookedDates={true}
                    allowPastDates={true}
                    onDateChange={(start, end) => {
                      setForm({ ...form, serviceDate: start, returnDate: end });
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                  <Input
                    label={t("maintenance.serviceDate")}
                    type="date"
                    required
                    value={form.serviceDate}
                    onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                  />
                  <Input
                    label={t("bookings.returnDate")}
                    type="date"
                    value={form.returnDate}
                    onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                  />
                </div>
              )}
            </div>

            <aside className={styles.vehicleSummary}>
              {selectedVehicle ? (
                <>
                  <div>
                    <span style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                      {selectedVehicle.plateNumber}
                    </span>
                    <strong style={{ display: "block", marginTop: "4px", fontSize: "1.05rem", color: "var(--text-primary)" }}>
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </strong>
                  </div>
                  <div className={styles.vehicleSummaryGrid}>
                    <div>
                      <span>{t("label.status")}</span>
                      <strong>{selectedVehicle.status}</strong>
                    </div>
                    <div>
                      <span>{t("vehicles.year")}</span>
                      <strong>{selectedVehicle.year || "-"}</strong>
                    </div>
                    <div>
                      <span>{t("vehicles.mileage")}</span>
                      <strong>{selectedVehicle.mileage?.toLocaleString() || 0} km</strong>
                    </div>
                    <div>
                      <span>{t("vehicles.dailyRate")}</span>
                      <strong>{selectedVehicle.dailyRate ? `${selectedVehicle.dailyRate} ${currency}` : "-"}</strong>
                    </div>
                    <div>
                      <span>{t("vehicles.fuelType")}</span>
                      <strong>{selectedVehicle.fuelType || "-"}</strong>
                    </div>
                    <div>
                      <span>{t("vehicles.transmission")}</span>
                      <strong>{selectedVehicle.transmission || "-"}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>
                  {t("maintenance.selectVehicleHint")}
                </div>
              )}
            </aside>
          </div>
        </Card>

        <Card padding="lg">
          <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("maintenance.diagnosis")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  <span>{t("maintenance.interventionType")} <span style={{ color: "var(--danger)" }}>*</span></span>
                  {form.types.length > 0 && (
                    <span style={{ padding: "2px 8px", borderRadius: "999px", background: "var(--accent-muted)", color: "var(--accent)", fontSize: "0.75rem", fontWeight: 700 }}>
                      {form.types.length}
                    </span>
                  )}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", background: "var(--bg-primary)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", width: "100%" }}>
                  {MAINTENANCE_TYPES.map((type) => {
                    const checked = form.types.includes(type);
                    return (
                      <label
                        key={type}
                        className={`${styles.selectableTile} ${checked ? styles.selectionChecked : ""}`}
                        style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          minHeight: "42px",
                          padding: "9px 10px",
                          borderRadius: "8px",
                          border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                          background: checked ? "var(--accent-muted)" : "var(--bg-secondary)",
                          color: checked ? "var(--accent)" : "var(--text-primary)",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: checked ? 700 : 500,
                          transition: "border-color 120ms ease, background 120ms ease, color 120ms ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (type === "Autre" && otherServices.length === 0) {
                                setOtherServices([createOtherService()]);
                              }
                              setForm({ ...form, types: [...form.types, type] });
                            } else {
                              const interventionDetails = { ...form.interventionDetails };
                              const interventionCosts = { ...form.interventionCosts };
                              delete interventionDetails[type];
                              delete interventionCosts[type];
                              if (type === "Autre") {
                                setOtherServices([]);
                              }
                              setForm({
                                ...form,
                                types: form.types.filter((item) => item !== type),
                                interventionDetails,
                                interventionCosts,
                              });
                            }
                          }}
                          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                        />
                        <span
                          aria-hidden="true"
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "6px",
                            border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                            background: checked ? "var(--accent)" : "var(--bg-primary)",
                            color: checked ? "var(--bg-primary)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: "0 0 auto",
                          }}
                        >
                          <Check size={13} strokeWidth={3} />
                        </span>
                        <span style={{ lineHeight: 1.25 }}>{maintenanceLabel(type)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {renderedDetailTypes.length > 0 && (
              <div className={styles.detailPanelGrid}>
                {renderedDetailTypes
                  .map((type) => {
                    const detailConfig = INTERVENTION_DETAILS[type];
                    const selectedDetails = form.interventionDetails[type] || [];
                    const interventionCost = form.interventionCosts[type] || 0;
                    const isAccidentRepair = type === "Réparation après accident";
                    const renderedOptions = isAccidentRepair
                      ? Array.from(new Set([...detailConfig.options, ...selectedDetails]))
                      : detailConfig.options;
                    const isWheelDiagram =
                      type === "Plaquettes de frein (avant / arrière)" ||
                      type === "Changement des pneus" ||
                      type === "Disques de frein" ||
                      type === "Équilibrage & parallélisme";
                    const isExiting = exitingDetailTypes.includes(type);

                    return (
                      <div
                        key={type}
                        className={`${styles.detailPanel} ${isExiting ? styles.detailPanelOut : ""}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          padding: "12px",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          background: "var(--bg-primary)",
                          pointerEvents: isExiting ? "none" : "auto",
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          <span>{maintenanceLabel(detailConfig.title)}</span>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600 }}>{maintenanceLabel(type)}</span>
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700 }}>
                            {t("maintenance.amountSpent")} ({currency})
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={interventionCost}
                            onChange={(e) => {
                              const nextCosts = { ...form.interventionCosts };
                              const nextValue = Number(e.target.value);

                              if (nextValue > 0) {
                                nextCosts[type] = nextValue;
                              } else {
                                delete nextCosts[type];
                              }

                              setForm({
                                ...form,
                                interventionCosts: nextCosts,
                              });
                            }}
                            style={{
                              height: "38px",
                              padding: "0 12px",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              background: "var(--bg-secondary)",
                              color: "var(--text-primary)",
                              fontWeight: 700,
                            }}
                          />
                        </div>
                        {isWheelDiagram ? (
                          <div className={styles.brakeDiagram}>
                            <button
                              type="button"
                              className={`${styles.orientationLabel} ${styles.frontLabel}`}
                              onClick={() => {
                                const frontOptions = renderedOptions.filter((option) => option.includes("avant"));
                                const allFrontSelected = frontOptions.every((option) => selectedDetails.includes(option));
                                const nextDetails = allFrontSelected
                                  ? selectedDetails.filter((item) => !frontOptions.includes(item))
                                  : Array.from(new Set([...selectedDetails, ...frontOptions]));

                                setForm({
                                  ...form,
                                  interventionDetails: {
                                    ...form.interventionDetails,
                                    [type]: nextDetails,
                                  },
                                });
                              }}
                            >
                              {t("maintenance.front")}
                            </button>
                            <button
                              type="button"
                              className={`${styles.orientationLabel} ${styles.rearLabel}`}
                              onClick={() => {
                                const rearOptions = renderedOptions.filter((option) => option.includes("arrière"));
                                const allRearSelected = rearOptions.every((option) => selectedDetails.includes(option));
                                const nextDetails = allRearSelected
                                  ? selectedDetails.filter((item) => !rearOptions.includes(item))
                                  : Array.from(new Set([...selectedDetails, ...rearOptions]));

                                setForm({
                                  ...form,
                                  interventionDetails: {
                                    ...form.interventionDetails,
                                    [type]: nextDetails,
                                  },
                                });
                              }}
                            >
                              {t("maintenance.rear")}
                            </button>
                            <div
                              aria-hidden="true"
                              className={styles.carBody}
                            >
                              <div style={{ position: "absolute", top: "18px", left: "22px", right: "22px", height: "32px", borderRadius: "16px 16px 8px 8px", background: "var(--bg-primary)", border: "1px solid var(--border)" }} />
                              <div style={{ position: "absolute", top: "62px", left: "18px", right: "18px", height: "62px", borderRadius: "18px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }} />
                              <div style={{ position: "absolute", bottom: "20px", left: "24px", right: "24px", height: "28px", borderRadius: "8px", background: "var(--bg-primary)", border: "1px solid var(--border)" }} />
                            </div>
                            {renderedOptions.map((option) => {
                              const checked = selectedDetails.includes(option);
                              const isFront = option.includes("avant");
                              const isLeft = option.includes("gauche");
                              const positionClass = isFront
                                ? isLeft
                                  ? styles.frontLeft
                                  : styles.frontRight
                                : isLeft
                                  ? styles.rearLeft
                                  : styles.rearRight;

                              return (
                                <button
                                  key={option}
                                  type="button"
                                  aria-label={maintenanceLabel(option)}
                                  title={maintenanceLabel(option)}
                                  className={`${styles.wheelButton} ${positionClass} ${checked ? styles.wheelSelected : ""}`}
                                  onClick={() => {
                                    const nextDetails = checked
                                      ? selectedDetails.filter((item) => item !== option)
                                      : [...selectedDetails, option];

                                    setForm({
                                      ...form,
                                      interventionDetails: {
                                        ...form.interventionDetails,
                                        [type]: nextDetails,
                                      },
                                    });
                                  }}
                                  style={{
                                    border: `2px solid ${checked ? "var(--accent)" : "var(--text-tertiary)"}`,
                                    background: checked ? "var(--accent)" : "var(--text-primary)",
                                    boxShadow: checked ? "0 0 0 4px var(--accent-muted)" : "none",
                                  }}
                                >
                                  {checked && <Check size={18} strokeWidth={3} />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                            {renderedOptions.map((option) => {
                              const checked = selectedDetails.includes(option);

                              return (
                                <label
                                  key={option}
                                  className={`${styles.selectableTile} ${checked ? styles.selectionChecked : ""}`}
                                  style={{
                                    position: "relative",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    minHeight: "38px",
                                    padding: "8px 10px",
                                    borderRadius: "8px",
                                    border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                                    background: checked ? "var(--accent-muted)" : "var(--bg-secondary)",
                                    color: checked ? "var(--accent)" : "var(--text-primary)",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    fontWeight: checked ? 700 : 500,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const nextDetails = e.target.checked
                                        ? [...selectedDetails, option]
                                        : selectedDetails.filter((item) => item !== option);

                                      setForm({
                                        ...form,
                                        interventionDetails: {
                                          ...form.interventionDetails,
                                          [type]: nextDetails,
                                        },
                                      });
                                    }}
                                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                                  />
                                  <span
                                    aria-hidden="true"
                                    style={{
                                      width: "18px",
                                      height: "18px",
                                      borderRadius: "6px",
                                      border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                                      background: checked ? "var(--accent)" : "var(--bg-primary)",
                                      color: checked ? "var(--bg-primary)" : "transparent",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flex: "0 0 auto",
                                    }}
                                  >
                                    <Check size={13} strokeWidth={3} />
                                  </span>
                                  <span style={{ lineHeight: 1.25 }}>{maintenanceLabel(option)}</span>
                                </label>
                              );
                            })}
                            {isAccidentRepair && (
                              <div style={{ display: "flex", gap: "8px", gridColumn: "1 / -1", marginTop: "4px" }}>
                                <input
                                  type="text"
                                  value={newAccidentRepairItem}
                                  onChange={(e) => setNewAccidentRepairItem(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key !== "Enter") return;
                                    e.preventDefault();
                                    const item = newAccidentRepairItem.trim();
                                    if (!item || selectedDetails.includes(item)) return;

                                    setForm({
                                      ...form,
                                      interventionDetails: {
                                        ...form.interventionDetails,
                                        [type]: [...selectedDetails, item],
                                      },
                                    });
                                    setNewAccidentRepairItem("");
                                  }}
                                  placeholder={t("maintenance.addItemPlaceholder")}
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    height: "38px",
                                    padding: "0 12px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    background: "var(--bg-secondary)",
                                    color: "var(--text-primary)",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const item = newAccidentRepairItem.trim();
                                    if (!item || selectedDetails.includes(item)) return;

                                    setForm({
                                      ...form,
                                      interventionDetails: {
                                        ...form.interventionDetails,
                                        [type]: [...selectedDetails, item],
                                      },
                                    });
                                    setNewAccidentRepairItem("");
                                  }}
                                  style={{
                                    height: "38px",
                                    padding: "0 14px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--accent)",
                                    background: "var(--accent-muted)",
                                    color: "var(--accent)",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {t("action.add")}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {form.types.includes("Autre") && (
              <div className={styles.otherServicesPanel}>
                <div className={styles.otherServicesHeader}>
                  <div>
                    <strong>{t("maintenance.otherServices")}</strong>
                    <span>{t("maintenance.otherServicesHint")}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={14} />}
                    onClick={() => setOtherServices((current) => [...current, createOtherService()])}
                  >
                    {t("action.add")}
                  </Button>
                </div>

                <div className={styles.otherServicesList}>
                  {otherServices.map((service, index) => (
                    <div key={service.id} className={styles.otherServiceRow}>
                      <Input
                        label={index === 0 ? t("maintenance.serviceName") : undefined}
                        value={service.name}
                        placeholder={t("maintenance.serviceNamePlaceholder")}
                        onChange={(e) => {
                          const value = e.target.value;
                          setOtherServices((current) =>
                            current.map((item) => (item.id === service.id ? { ...item, name: value } : item))
                          );
                        }}
                      />
                      <Input
                        label={index === 0 ? `${t("maintenance.repairCostLabel")} (${currency})` : undefined}
                        type="number"
                        min={0}
                        value={service.price}
                        placeholder="0"
                        onChange={(e) => {
                          const value = e.target.value === "" ? "" : Number(e.target.value);
                          setOtherServices((current) =>
                            current.map((item) => (item.id === service.id ? { ...item, price: value } : item))
                          );
                        }}
                      />
                      <button
                        type="button"
                        className={styles.otherServiceRemove}
                        aria-label={t("action.delete")}
                        title={t("action.delete")}
                        disabled={otherServices.length === 1}
                        onClick={() => {
                          setOtherServices((current) => current.filter((item) => item.id !== service.id));
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {otherServiceTotal > 0 && (
                  <div className={styles.otherServicesTotal}>
                    <span>{t("label.total")}</span>
                    <strong>{otherServiceTotal.toLocaleString()} {currency}</strong>
                  </div>
                )}
              </div>
            )}
            
            <div style={{ maxWidth: "360px" }}>
              <Input
                label={`${t("maintenance.repairCostLabel")} (${currency})`}
                type="number"
                min={0}
                required
                value={interventionCostTotal > 0 ? interventionCostTotal : form.cost}
                disabled={interventionCostTotal > 0}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              />
            </div>

            <Textarea 
              label={t("maintenance.secondaryNotes")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t("maintenance.notesPlaceholder")}
              rows={3} 
            />
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
          <Button variant="secondary" type="button" onClick={() => router.back()}>{t("action.cancel")}</Button>
          <Button type="submit" loading={loading} icon={<Save size={16} />}>{t("maintenance.schedule")}</Button>
        </div>
      </form>

      <Modal
        isOpen={mileageModalOpen}
        onClose={() => {
          if (!loading) setMileageModalOpen(false);
        }}
        title={t("maintenance.mileagePromptTitle")}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => setMileageModalOpen(false)}
            >
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              loading={loading}
              icon={<Save size={16} />}
              onClick={handleConfirmMileage}
            >
              {t("maintenance.confirmSchedule")}
            </Button>
          </>
        }
      >
        <div className={styles.mileagePrompt}>
          <div className={styles.mileageIcon} aria-hidden="true">
            <Gauge size={24} />
          </div>
          <div className={styles.mileageCopy}>
            <strong>{selectedVehicle ? `${selectedVehicle.plateNumber} ${selectedVehicle.brand} ${selectedVehicle.model}` : t("maintenance.title")}</strong>
            <span>{t("maintenance.mileagePromptDesc")}</span>
          </div>
          <div className={styles.mileageStats}>
            <div>
              <span>{t("bookings.currentMileage")}</span>
              <strong>{currentMileage.toLocaleString()} km</strong>
            </div>
            <div>
              <span>{t("maintenance.serviceDate")}</span>
              <strong>{form.serviceDate}</strong>
            </div>
          </div>
          <Input
            label={t("bookings.newMileage")}
            type="number"
            min={currentMileage}
            value={mileageDraft}
            error={mileageError}
            autoFocus
            onChange={(e) => {
              setMileageDraft(e.target.value);
              if (mileageError) setMileageError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirmMileage();
              }
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
