"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Save, Building2, User, Plus, X, Calendar, Car, ClipboardList, ChevronRight, ChevronLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import BookingCalendar from "@/components/ui/BookingCalendar";
import { useToast } from "@/components/ui/Toast";
import { createBooking } from "@/actions/bookings";
import { createCustomer } from "@/actions/customers";
import { useSettings } from "@/lib/SettingsContext";
import styles from "./BookingForm.module.css";

export default function BookingForm({ vehicles, customers: initialCustomers }: { vehicles: any[]; customers: any[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { formatPrice, t } = useSettings();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState(initialCustomers);
  const [showNewBroker, setShowNewBroker] = useState(false);
  const [brokerLoading, setBrokerLoading] = useState(false);
  const [newBroker, setNewBroker] = useState({ firstName: "", lastName: "", phone: "" });
  const [step, setStep] = useState(1);
  const [showDriver2, setShowDriver2] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    vehicleId: "",
    startDate: "",
    endDate: "",
    clientType: "PARTICULIER",
    companyName: "",
    companyICE: "",
    paymentMethod: "ESPECE",
    driverFirstName: "",
    driverLastName: "",
    driverCIN: "",
    driverLicense: "",
    driver2FirstName: "",
    driver2LastName: "",
    driver2CIN: "",
    driver2License: "",
    pricePerDay: "",
    pickupLocation: "",
    returnLocation: "",
    notes: "",
  });

  // Calculate pricing based on dates & selected vehicle
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const start = form.startDate ? new Date(form.startDate) : null;
  const end = form.endDate ? new Date(form.endDate) : null;

  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const dateWithinRange = (date: Date, rangeStart: Date, rangeEnd: Date) => {
    const value = normalizeDate(date).getTime();
    return value >= normalizeDate(rangeStart).getTime() && value <= normalizeDate(rangeEnd).getTime();
  };

  const addYears = (date: Date, years: number) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  };
  
  // Auto-set price per day when vehicle changes
  const enteredRate = Number(form.pricePerDay);
  const effectiveRate = enteredRate > 0 ? enteredRate : (selectedVehicle?.dailyRate || 0);

  let days = 0;
  if (start && end && end >= start) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  
  const estimatedTotal = days * effectiveRate;

  const bookingWarnings = useMemo(() => {
    if (!selectedVehicle || !start || !end || end < start) return [];

    const warnings: string[] = [];
    const latestInsurance = selectedVehicle.insurancePayments?.[0];
    const insuranceEndDate = latestInsurance?.endDate
      ? new Date(latestInsurance.endDate)
      : selectedVehicle.insuranceExpiry
        ? new Date(selectedVehicle.insuranceExpiry)
        : null;

    if (insuranceEndDate && dateWithinRange(insuranceEndDate, start, end)) {
      warnings.push(`Insurance expires during this booking on ${insuranceEndDate.toLocaleDateString()}.`);
    }

    const latestInspection = selectedVehicle.technicalInspections?.[0];
    const technicalDueDate = latestInspection?.nextDueDate
      ? new Date(latestInspection.nextDueDate)
      : selectedVehicle.technicalInspectionDueDate
        ? new Date(selectedVehicle.technicalInspectionDueDate)
        : selectedVehicle.circulationDate
          ? addYears(new Date(selectedVehicle.circulationDate), 1)
          : null;

    if (technicalDueDate && dateWithinRange(technicalDueDate, start, end)) {
      warnings.push(`Technical inspection is due during this booking on ${technicalDueDate.toLocaleDateString()}.`);
    }

    const paidVignetteYears = new Set([
      ...(selectedVehicle.vignettePayments || []).map((payment: any) => payment.year),
      ...(selectedVehicle.expenses || []).map((expense: any) => new Date(expense.date).getFullYear()),
    ]);
    for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
      const deadline = new Date(year, 0, 30);
      const bookingTouchesYear = normalizeDate(start).getFullYear() <= year && normalizeDate(end).getFullYear() >= year;
      const deadlineApplies = bookingTouchesYear && normalizeDate(end).getTime() >= deadline.getTime();
      if (deadlineApplies && !paidVignetteYears.has(year)) {
        warnings.push(`Vignette for ${year} is not marked paid. Deadline is ${deadline.toLocaleDateString()}.`);
      }
    }

    return warnings;
  }, [selectedVehicle, start, end]);

  // Filter vehicles by availability when dates are selected
  const isVehicleAvailable = (vehicle: any): boolean => {
    if (!start || !end) return true;
    const bookings = vehicle.bookings || [];
    return !bookings.some((b: any) => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return bStart <= end && bEnd >= start;
    });
  };

  const vehicleOptions = useMemo(() => {
    return vehicles.map((v) => {
      const available = isVehicleAvailable(v);
      return {
        value: v.id,
        label: `${v.brand} ${v.model} — [${v.plateNumber}]${!available ? " ❌ Unavailable" : v.status === "RENTED" ? " 🔑" : " ✅"}`,
        available,
      };
    });
  }, [vehicles, form.startDate, form.endDate]);

  const handleVehicleChange = (vehicleId: string) => {
    const v = vehicles.find((veh) => veh.id === vehicleId);
    setForm({
      ...form,
      vehicleId,
      pricePerDay: v?.dailyRate ? String(v.dailyRate) : "",
    });
  };

  const handleCalendarDateChange = (startVal: string, endVal: string) => {
    setForm({ ...form, startDate: startVal, endDate: endVal });
  };

  const handleCreateBroker = async () => {
    if (!newBroker.firstName || !newBroker.lastName) {
      toast("First and last name are required", "error");
      return;
    }
    setBrokerLoading(true);
    const result = await createCustomer(newBroker);
    setBrokerLoading(false);

    if (result.success && result.data) {
      const created = result.data as any;
      setCustomers([created, ...customers]);
      setForm({ ...form, customerId: created.id });
      setNewBroker({ firstName: "", lastName: "", phone: "" });
      setShowNewBroker(false);
      toast("Broker created & selected!", "success");
    } else {
      toast(result.message, "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.vehicleId || !form.startDate || !form.endDate) {
      toast("Please fill all required fields", "error");
      return;
    }

    if (form.clientType === "ENTREPRISE" && (!form.companyName || !form.companyICE)) {
      toast("Company name and ICE are required for company rentals", "error");
      return;
    }

    if (form.clientType === "ENTREPRISE" && (!form.driverLastName || !form.driverFirstName || !form.driverCIN)) {
      toast("Driver information is required for company rentals", "error");
      return;
    }

    setLoading(true);
    const result = await createBooking({
      ...form,
      pricePerDay: effectiveRate,
      totalAmount: estimatedTotal,
    });

    setLoading(false);

    if (result.success && result.data) {
      toast(result.message, "success");
      const createdBooking = result.data as any;
      router.push(`/bookings/${createdBooking.id}`);
    } else {
      toast(result.message, "error");
    }
  };

  const steps = [
    { id: 1, name: t("label.date"), icon: <Calendar size={18} /> },
    { id: 2, name: t("bookings.vehicle"), icon: <Car size={18} /> },
    { id: 3, name: t("bookings.details"), icon: <ClipboardList size={18} /> },
  ];

  const availableVehicles = useMemo(() => {
    return vehicles.filter(isVehicleAvailable);
  }, [vehicles, form.startDate, form.endDate]);

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className={`page-header ${styles.headerRow}`}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em" }}>{t("bookings.newBooking")}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            {t("bookings.newBookingDesc")}
          </p>
        </div>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          {t("action.back")}
        </Button>
      </div>

      {/* Stepper Progress */}
      <div className={styles.stepper}>
        <div className={styles.stepperLine}>
          <div style={{
            height: "100%",
            background: "var(--accent)",
            width: `${((step - 1) / (steps.length - 1)) * 100}%`,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          }} />
        </div>
        
        {steps.map((s) => (
          <div 
            key={s.id} 
            className={styles.stepperItem}
          >
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: step >= s.id ? "var(--accent)" : "var(--bg-secondary)",
              color: step >= s.id ? "white" : "var(--text-secondary)",
              border: step >= s.id ? "none" : "2px solid var(--border)",
              boxShadow: step === s.id ? "0 0 0 4px var(--accent-muted)" : "none",
              transition: "all 0.3s ease",
              cursor: step > s.id ? "pointer" : "default"
            }}
            onClick={() => step > s.id && setStep(s.id)}
            >
              {step > s.id ? <Save size={18} /> : s.icon}
            </div>
            <span className={`${styles.stepperLabel} ${step === s.id ? styles.stepperLabelActive : ""}`}>
              {s.name}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.wizardSection}>
        
        {/* Step 1: Dates */}
        {step === 1 && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <Card padding="lg">
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                  <Calendar size={20} className="text-accent" />
                  {t("bookings.step1Title")}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
                  {t("bookings.step1Desc")}
                </p>
              </div>
              
              <BookingCalendar
                bookedRanges={[]} // Show overall calendar, will filter vehicles in next step
                startDate={form.startDate}
                endDate={form.endDate}
                onDateChange={handleCalendarDateChange}
              />

              <div className={styles.selectionSummary}>
                <div style={{ flex: "1 1 200px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>{t("bookings.selectedDuration")}</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                    {start && end ? `${start.toLocaleDateString()} — ${end.toLocaleDateString()} (${days} ${t("label.days")})` : t("bookings.selectOnCalendar")}
                  </div>
                </div>
                  <Button 
                  type="button" 
                  disabled={!form.startDate || !form.endDate} 
                  onClick={() => setStep(2)}
                  className={styles.mobileFullWidth}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {t("bookings.seeAvailableCars")}
                    <ChevronRight size={18} />
                  </div>
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 2: Vehicle Selection */}
        {step === 2 && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <h3 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                  <Car size={20} className="text-accent" />
                  {t("bookings.step2Title")}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
                  {t("bookings.step2Desc")} ({availableVehicles.length})
                </p>
              </div>
              <Button variant="ghost" onClick={() => setStep(1)} icon={<ChevronLeft size={16} />}>{t("bookings.changeDates")}</Button>
            </div>

            <div className={styles.vehicleGrid}>
              {availableVehicles.map((v) => (
                <div 
                  key={v.id}
                  onClick={() => handleVehicleChange(v.id)}
                  className={`${styles.vehicleCard} ${form.vehicleId === v.id ? styles.vehicleCardSelected : ""}`}
                >
                  <div className={styles.vehicleImage}>
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt={v.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Car size={48} style={{ opacity: 0.2 }} />
                    )}
                    <div className={styles.vehicleImageBadge}>
                      {v.plateNumber}
                    </div>
                  </div>
                  <div style={{ padding: "16px" }}>
                    <h4 style={{ margin: 0, fontSize: "1.125rem" }}>{v.brand} {v.model}</h4>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                      <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent)" }}>
                        {formatPrice(v.dailyRate)}<span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-secondary)" }}> /day</span>
                      </span>
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        border: "2px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: form.vehicleId === v.id ? "var(--accent)" : "transparent",
                        borderColor: form.vehicleId === v.id ? "var(--accent)" : "var(--border)"
                      }}>
                        {form.vehicleId === v.id && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "white" }} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {bookingWarnings.length > 0 && (
              <div style={{ background: "var(--warning-muted)", border: "1px solid var(--warning)", borderRadius: "10px", padding: "14px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <AlertTriangle size={20} style={{ color: "var(--warning)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontWeight: 700, color: "var(--warning)", marginBottom: "6px" }}>Selected vehicle needs attention</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {bookingWarnings.map((warning) => (
                      <div key={warning}>{warning}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.navButtons}>
              <Button type="button" variant="secondary" onClick={() => setStep(1)} icon={<ChevronLeft size={18} />}>{t("action.back")}</Button>
              <Button 
                type="button" 
                disabled={!form.vehicleId} 
                onClick={() => setStep(3)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {t("bookings.continueToDetails")}
                  <ChevronRight size={18} />
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: All Details */}
        {step === 3 && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{t("bookings.step3Title")}</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)} icon={<ChevronLeft size={16} />}>
                {t("bookings.backToVehicle")}
              </Button>
            </div>
            
            <div className={styles.detailsGrid}>
              <div className={styles.detailsColumn}>
                {/* Client Type Toggle */}
                <Card padding="lg">
                  <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)", fontSize: "1rem" }}>{t("bookings.clientTypeLabel")}</h3>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, clientType: "PARTICULIER" })}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        padding: "16px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        border: form.clientType === "PARTICULIER" ? "2px solid var(--accent)" : "2px solid var(--border)",
                        background: form.clientType === "PARTICULIER" ? "var(--accent-muted)" : "var(--bg-secondary)",
                        color: form.clientType === "PARTICULIER" ? "var(--accent)" : "var(--text-secondary)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <User size={24} />
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t("bookings.individual")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, clientType: "ENTREPRISE" })}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        padding: "16px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        border: form.clientType === "ENTREPRISE" ? "2px solid var(--warning)" : "2px solid var(--border)",
                        background: form.clientType === "ENTREPRISE" ? "var(--warning-muted)" : "var(--bg-secondary)",
                        color: form.clientType === "ENTREPRISE" ? "var(--warning)" : "var(--text-secondary)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Building2 size={24} />
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t("bookings.company")}</span>
                    </button>
                  </div>

                  {form.clientType === "ENTREPRISE" && (
                    <div className={styles.companyGrid}>
                      <Input
                        label={t("bookings.companyName")}
                        required
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                        placeholder="e.g. SARL Transport Express"
                      />
                      <Input
                        label={t("bookings.companyICE")}
                        required
                        value={form.companyICE}
                        onChange={(e) => setForm({ ...form, companyICE: e.target.value })}
                        placeholder="e.g. 001234567000012"
                      />
                    </div>
                  )}
                </Card>

                <Card padding="lg">
                  <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)", fontSize: "1rem" }}>{t("bookings.brokerSelection")}</h3>
                  <div className={styles.brokerGrid}>
                    <div className={styles.brokerField}>
                      <Select
                        label={t("customers.broker")}
                        required
                        value={form.customerId}
                        onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                        options={customers.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.phone ? ` (${c.phone})` : ""}` }))}
                        placeholder={t("bookings.selectBroker")}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewBroker(!showNewBroker)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        border: showNewBroker ? "1px solid var(--danger)" : "1px solid var(--accent)",
                        background: showNewBroker ? "var(--danger-muted)" : "var(--accent-muted)",
                        color: showNewBroker ? "var(--danger)" : "var(--accent)",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {showNewBroker ? <X size={20} /> : <Plus size={20} />}
                    </button>
                  </div>

                  {showNewBroker && (
                    <div style={{ marginTop: "16px", padding: "20px", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--accent)" }}>{t("bookings.quickAddBroker")}</div>
                      <div className={styles.quickAddGrid}>
                        <Input
                          label={t("bookings.firstName")}
                          required
                          value={newBroker.firstName}
                          onChange={(e) => setNewBroker({ ...newBroker, firstName: e.target.value })}
                        />
                        <Input
                          label={t("bookings.lastName")}
                          required
                          value={newBroker.lastName}
                          onChange={(e) => setNewBroker({ ...newBroker, lastName: e.target.value })}
                        />
                      </div>
                      <Input
                        label={t("bookings.phone")}
                        value={newBroker.phone}
                        onChange={(e) => setNewBroker({ ...newBroker, phone: e.target.value })}
                      />
                      <Button type="button" size="sm" loading={brokerLoading} onClick={handleCreateBroker} fullWidth>{t("bookings.createAndSelect")}</Button>
                    </div>
                  )}
                </Card>
              </div>

              <div className={styles.detailsColumn}>
                <Card padding="lg">
                  <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)", fontSize: "1rem" }}>{t("bookings.pricingPayment")}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <Input
                      label={t("bookings.priceOverride")}
                      type="number"
                      value={form.pricePerDay}
                      onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })}
                    />

                    <Select
                      label={t("invoices.paymentMethod")}
                      required
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      options={[
                        { value: "ESPECE", label: t("payment.cash") },
                        { value: "CHEQUE", label: t("payment.check") },
                        { value: "TPE", label: t("payment.card") },
                      ]}
                    />

                    <div className={styles.summaryBox}>
                      <div className={styles.summaryRow}>
                        <span style={{ color: "var(--text-secondary)" }}>Selected Vehicle:</span>
                        <span style={{ fontWeight: 600 }}>{selectedVehicle?.brand} {selectedVehicle?.model}</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span style={{ color: "var(--text-secondary)" }}>{t("bookings.duration")}:</span>
                        <span style={{ fontWeight: 600 }}>{days} {t("label.days")}</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span style={{ color: "var(--text-secondary)" }}>{t("bookings.rate")}:</span>
                        <span style={{ fontWeight: 600 }}>{formatPrice(effectiveRate)}</span>
                      </div>
                      <div className={styles.summaryTotalRow}>
                        <span>{t("label.total")}:</span>
                        <span style={{ color: "var(--accent)", fontSize: "1.5rem" }}>{formatPrice(estimatedTotal)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Driver Information */}
            <Card padding="lg">
              <div className={styles.driverHeader}>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{t("bookings.driverInformation")}</h3>
                {!showDriver2 && (
                  <Button size="sm" variant="ghost" type="button" icon={<Plus size={14} />} onClick={() => setShowDriver2(true)}>
                    {t("bookings.addSecondDriver")}
                  </Button>
                )}
              </div>
              
              <div className={styles.driverGrid}>
                <Input
                  label={t("bookings.lastName")}
                  required={form.clientType === "ENTREPRISE"}
                  value={form.driverLastName}
                  onChange={(e) => setForm({ ...form, driverLastName: e.target.value })}
                />
                <Input
                  label={t("bookings.firstName")}
                  required={form.clientType === "ENTREPRISE"}
                  value={form.driverFirstName}
                  onChange={(e) => setForm({ ...form, driverFirstName: e.target.value })}
                />
                <Input
                  label={t("bookings.cinPassport")}
                  required={form.clientType === "ENTREPRISE"}
                  value={form.driverCIN}
                  onChange={(e) => setForm({ ...form, driverCIN: e.target.value })}
                />
                <Input
                  label={t("bookings.licenseNumber")}
                  value={form.driverLicense}
                  onChange={(e) => setForm({ ...form, driverLicense: e.target.value })}
                />
              </div>

              {showDriver2 && (
                <div className={styles.driverSecondary}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t("bookings.secondDriverOptional")}</h4>
                    <Button size="sm" variant="ghost" type="button" onClick={() => setShowDriver2(false)}>{t("bookings.removeDriver")}</Button>
                  </div>
                  <div className={styles.driverGrid}>
                    <Input label={t("bookings.lastName")} value={form.driver2LastName} onChange={(e) => setForm({ ...form, driver2LastName: e.target.value })} />
                    <Input label={t("bookings.firstName")} value={form.driver2FirstName} onChange={(e) => setForm({ ...form, driver2FirstName: e.target.value })} />
                    <Input label={t("bookings.cinPassport")} value={form.driver2CIN} onChange={(e) => setForm({ ...form, driver2CIN: e.target.value })} />
                    <Input label={t("bookings.licenseNumber")} value={form.driver2License} onChange={(e) => setForm({ ...form, driver2License: e.target.value })} />
                  </div>
                </div>
              )}
            </Card>

            <div className={styles.actionRow}>
              <Button variant="secondary" type="button" onClick={() => setStep(2)}>{t("bookings.backToVehicle")}</Button>
              <div className={styles.actionGroup}>
                <Button variant="ghost" type="button" onClick={() => router.back()}>{t("action.cancel")}</Button>
                <Button type="submit" loading={loading} icon={<Save size={16} />}>{t("bookings.confirmRental")}</Button>
              </div>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
