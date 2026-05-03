"use client";
import { useSettings } from "@/lib/SettingsContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Car, FileText, CheckCircle, XCircle, Trash2, Building2, CreditCard, Edit3, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input, { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createInvoice, updatePaymentStatus, deleteInvoice } from "@/actions/invoices";
import { updateBookingStatus, handleEarlyPickup, handleReturn, updateBookingDates, updateBookingDrivers } from "@/actions/bookings";
import { formatDate, formatDateInput, getBookingDisplayStatus, getRentalDays, getStatusColor, getStatusBg, getFullName } from "@/lib/utils";
import styles from "../bookings.module.css";

export default function BookingDetailClient({ booking }: { booking: any }) {
  const { formatPrice: formatCurrency, currency, t, formatStatusT } = useSettings();

  const router = useRouter();
  const { toast } = useToast();
  
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    discount: 0,
    extraCharges: 0,
    depositPaid: booking.depositAmount || 0,
    notes: "",
  });
  const [generating, setGenerating] = useState(false);
  const [isEarlyPickupModalOpen, setIsEarlyPickupModalOpen] = useState(false);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnUpdateDate, setReturnUpdateDate] = useState(false);
  const [returnMileage, setReturnMileage] = useState(String(booking.vehicle.mileage || 0));
  const [isEditDatesModalOpen, setIsEditDatesModalOpen] = useState(false);
  const [editDatesLoading, setEditDatesLoading] = useState(false);
  const [editStartDate, setEditStartDate] = useState(formatDateInput(booking.startDate));
  const [editEndDate, setEditEndDate] = useState(formatDateInput(booking.endDate));
  const [editPricePerDay, setEditPricePerDay] = useState(booking.pricePerDay ?? booking.vehicle.dailyRate);
  const [isEditDriversModalOpen, setIsEditDriversModalOpen] = useState(false);
  const [editDriversLoading, setEditDriversLoading] = useState(false);
  const [showSecondDriver, setShowSecondDriver] = useState(Boolean(
    booking.driver2FirstName || booking.driver2LastName || booking.driver2CIN || booking.driver2License
  ));
  const [driverForm, setDriverForm] = useState({
    driverFirstName: booking.driverFirstName || "",
    driverLastName: booking.driverLastName || "",
    driverCIN: booking.driverCIN || "",
    driverLicense: booking.driverLicense || "",
    driver2FirstName: booking.driver2FirstName || "",
    driver2LastName: booking.driver2LastName || "",
    driver2CIN: booking.driver2CIN || "",
    driver2License: booking.driver2License || "",
  });
  const displayStatus = getBookingDisplayStatus(booking);

  // Duration
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const days = getRentalDays(start, end);
  const baseSubtotal = days * booking.vehicle.dailyRate;
  const editPreviewDays = editStartDate && editEndDate && new Date(editEndDate) > new Date(editStartDate)
    ? getRentalDays(editStartDate, editEndDate)
    : 0;
  const validateReturnMileage = () => {
    const mileage = Number(returnMileage);
    if (returnMileage === "" || Number.isNaN(mileage) || mileage < (booking.vehicle.mileage || 0)) {
      toast(t("toast.mileageError"), "error");
      return null;
    }
    return mileage;
  };

  const openEditDriversModal = () => {
    setDriverForm({
      driverFirstName: booking.driverFirstName || "",
      driverLastName: booking.driverLastName || "",
      driverCIN: booking.driverCIN || "",
      driverLicense: booking.driverLicense || "",
      driver2FirstName: booking.driver2FirstName || "",
      driver2LastName: booking.driver2LastName || "",
      driver2CIN: booking.driver2CIN || "",
      driver2License: booking.driver2License || "",
    });
    setShowSecondDriver(Boolean(booking.driver2FirstName || booking.driver2LastName || booking.driver2CIN || booking.driver2License));
    setIsEditDriversModalOpen(true);
  };

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    const res = await createInvoice({
      bookingId: booking.id,
      subtotal: baseSubtotal,
      extraCharges: invoiceForm.extraCharges,
      discount: invoiceForm.discount,
      depositPaid: invoiceForm.depositPaid,
      notes: invoiceForm.notes,
    });
    setGenerating(false);

    if (res.success) {
      toast("Invoice generated successfully!", "success");
      setIsInvoiceModalOpen(false);
    } else {
      toast(res.message, "error");
    }
  };

  const handleMarkUnpaid = async () => {
    if (!booking.invoice) return;
    setGenerating(true);
    const res = await updatePaymentStatus(booking.invoice.id, "PENDING", 0, false);
    setGenerating(false);
    if (res.success) {
      toast("Invoice reverted to PENDING", "success");
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!booking.invoice) return;
    setGenerating(true);
    const res = await deleteInvoice(booking.invoice.id);
    setGenerating(false);
    if (res.success) {
      toast("Invoice deleted", "success");
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div className={`animate-fade-in ${styles.detailPage}`}>
      <div className="page-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
          <h1>{t("bookings.details")}</h1>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>ID: {booking.id}</span>
        </div>
        <div className={styles.detailTopRow}>
          <Badge color={getStatusColor(displayStatus)} bg={getStatusBg(displayStatus)} dot>
            {formatStatusT(displayStatus)}
          </Badge>
          <Badge 
            color={booking.clientType === "ENTREPRISE" ? "var(--warning)" : "var(--info)"}
            bg={booking.clientType === "ENTREPRISE" ? "var(--warning-muted)" : "var(--info-muted)"}
          >
            {booking.clientType === "ENTREPRISE" ? t("bookings.company") : t("bookings.individual")}
          </Badge>
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
            {t("action.back")}
          </Button>
        </div>
      </div>

      <div className={styles.detailMainGrid}>
        
        {/* Left Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
          
          <div className={styles.detailCardsGrid}>
            <Card padding="lg" hover onClick={() => router.push(`/customers/${booking.customerId}`)}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                <User size={16} /> {t("bookings.broker")}
              </h3>
              <div style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "4px" }}>
                {getFullName(booking.customer.firstName, booking.customer.lastName)}
              </div>
              {booking.customer.phone && (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {booking.customer.phone}
                </div>
              )}
              {booking.customer.licenseNumber && (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "8px" }}>
                   {t("bookings.license")}: {booking.customer.licenseNumber}
                </div>
              )}
            </Card>

            <Card padding="lg" hover onClick={() => router.push(`/vehicles/${booking.vehicleId}`)}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                <Car size={16} /> {t("bookings.vehicle")}
              </h3>
              <div style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "4px" }}>
                {booking.vehicle.brand} {booking.vehicle.model}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {booking.vehicle.year} · {booking.vehicle.color}
              </div>
              <div style={{ padding: "4px 8px", background: "var(--bg-tertiary)", display: "inline-block", borderRadius: "6px", fontSize: "0.75rem", marginTop: "8px", fontWeight: 600 }}>
                {booking.vehicle.plateNumber}
              </div>
            </Card>
          </div>

          <Card padding="lg">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0 }}>{t("bookings.timeline")}</h3>
              {booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Edit3 size={14} />}
                  onClick={() => {
                    setEditStartDate(formatDateInput(booking.startDate));
                    setEditEndDate(formatDateInput(booking.endDate));
                    setEditPricePerDay(booking.pricePerDay ?? booking.vehicle.dailyRate);
                    setIsEditDatesModalOpen(true);
                  }}
                >
                  {t("bookings.editDates")}
                </Button>
              )}
            </div>
            
            <div className={styles.detailPickupRow}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>{t("bookings.pickup")}</span>
                <span style={{ fontWeight: 600, fontSize: "1.125rem" }}>{formatDate(booking.startDate)}</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{booking.pickupLocation || t("bookings.mainOffice")}</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-tertiary)" }}>
                <div style={{ padding: "4px 12px", background: "var(--bg-secondary)", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 }}>
                  {days} {t("label.days")}
                </div>
                <div style={{ width: "100px", height: "1px", background: "var(--border)", margin: "8px 0" }}></div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>{t("bookings.return")}</span>
                <span style={{ fontWeight: 600, fontSize: "1.125rem" }}>{formatDate(booking.endDate)}</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{booking.returnLocation || t("bookings.mainOffice")}</span>
              </div>
            </div>

            {booking.notes && (
              <div style={{ marginTop: "24px" }}>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "8px" }}>{t("label.notes")}:</h4>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{booking.notes}</p>
              </div>
            )}
          </Card>

          {/* Company Info */}
          {booking.clientType === "ENTREPRISE" && (
            <Card padding="lg">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                <Building2 size={16} /> {t("bookings.companyInfo")}
              </h3>
              <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <span style={{ color: "var(--text-secondary)" }}>{t("bookings.company")}</span>
                  <span style={{ fontWeight: 600 }}>{booking.companyName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>ICE</span>
                  <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{booking.companyICE}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Driver Info */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <h3 style={{ margin: 0 }}>{t("bookings.driverInformation")}</h3>
            <Button
              size="sm"
              variant="ghost"
              icon={<Edit3 size={14} />}
              onClick={openEditDriversModal}
            >
              {t("action.edit")}
            </Button>
          </div>
          <div className={styles.detailDriversGrid}>
            <Card padding="lg">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                <User size={16} /> {t("bookings.primaryDriver")}
              </h3>
              <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                     <span style={{ color: "var(--text-secondary)" }}>{t("driver.name")}</span>
                  <span style={{ fontWeight: 600 }}>{booking.driverFirstName || "-"} {booking.driverLastName || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                     <span style={{ color: "var(--text-secondary)" }}>{t("driver.cin")}</span>
                  <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{booking.driverCIN || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                     <span style={{ color: "var(--text-secondary)" }}>{t("driver.license")}</span>
                  <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{booking.driverLicense || "-"}</span>
                </div>
              </div>
            </Card>
            
            {booking.driver2FirstName || booking.driver2LastName || booking.driver2CIN || booking.driver2License ? (
              <Card padding="lg">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <User size={16} /> {t("bookings.secondDriver")}
                </h3>
                <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{t("driver.name")}</span>
                    <span style={{ fontWeight: 600 }}>{booking.driver2FirstName || "-"} {booking.driver2LastName || "-"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{t("driver.cin")}</span>
                    <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{booking.driver2CIN || "-"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{t("driver.license")}</span>
                    <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{booking.driver2License || "-"}</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card padding="lg">
                <div style={{ display: "flex", minHeight: "132px", alignItems: "center", justifyContent: "center" }}>
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<Plus size={16} />}
                    onClick={() => {
                      openEditDriversModal();
                      setShowSecondDriver(true);
                    }}
                  >
                    {t("bookings.addSecondDriver")}
                  </Button>
                </div>
              </Card>
            )}
          </div>

        </div>

        {/* Right Col */}
        <div className={styles.detailRightCol}>
          
          <Card padding="lg">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <FileText size={16} /> {t("bookings.financials")}
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", cursor: booking.status !== "COMPLETED" && booking.status !== "CANCELLED" ? "pointer" : "default", borderRadius: "6px", padding: "4px 0" }}
                onClick={() => {
                  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") return;
                  setEditStartDate(formatDateInput(booking.startDate));
                  setEditEndDate(formatDateInput(booking.endDate));
                  setEditPricePerDay(booking.pricePerDay ?? booking.vehicle.dailyRate);
                  setIsEditDatesModalOpen(true);
                }}
                title={booking.status !== "COMPLETED" && booking.status !== "CANCELLED" ? "Click to edit" : ""}
              >
                <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  {t("vehicles.dailyRate")} ({days} {t("label.days")})
                  {booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && <Edit3 size={12} style={{ color: "var(--text-tertiary)" }} />}
                </span>
                <span>{formatCurrency(booking.pricePerDay ?? booking.vehicle.dailyRate)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>{t("bookings.deposit")}</span>
                <span>{formatCurrency(booking.depositAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border)", fontWeight: 700, fontSize: "1.125rem", color: "var(--accent)" }}>
                <span>{t("bookings.totalAmount")}</span>
                <span>{formatCurrency(booking.totalAmount)}</span>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed var(--border)" }}>
              {booking.invoice ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--success)" }}>
                      <CheckCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }}/> 
                      {t("invoices.invoiced")} ({booking.invoice.paymentStatus})
                    </span>
                    <Link href={`/invoices/${booking.invoice.id}`}>
                      <Button size="sm" variant="secondary">{t("invoices.viewInvoice")}</Button>
                    </Link>
                  </div>
                  
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    {booking.invoice.paymentStatus === "PAID" && (
                      <Button size="sm" variant="secondary" onClick={handleMarkUnpaid} loading={generating}>
                        {t("invoices.markUnpaid")}
                      </Button>
                    )}
                    <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={handleDeleteInvoice} loading={generating} />
                  </div>
                </div>
              ) : (
                <Button fullWidth variant="primary" icon={<FileText size={16} />} onClick={() => setIsInvoiceModalOpen(true)}>
                  {t("invoices.generateInvoice")}
                </Button>
              )}
            </div>
          </Card>

          {/* Quick Actions Placeholder */}
          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("label.actions")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Button
                fullWidth
                variant="success"
                icon={<CheckCircle size={16} />}
                disabled={booking.status !== "CONFIRMED"}
                loading={pickupLoading}
                onClick={async () => {
                  const today = new Date();
                  const pickupDate = new Date(booking.startDate);
                  const isToday = today.toDateString() === pickupDate.toDateString();

                  if (isToday) {
                    // Same day — direct pickup
                    setPickupLoading(true);
                    const res = await updateBookingStatus(booking.id, "ACTIVE");
                    setPickupLoading(false);
                    if (res.success) toast(t("toast.carPickedUp"), "success");
                    else toast(res.message, "error");
                  } else {
                    // Early pickup — open modal
                    setIsEarlyPickupModalOpen(true);
                  }
                }}
              >
                {t("bookings.markActive")}
              </Button>
              <Button
                fullWidth
                variant="secondary"
                icon={<CheckCircle size={16} />}
                disabled={booking.status !== "ACTIVE" && booking.status !== "LATE"}
                onClick={() => {
                  setReturnMileage(String(booking.vehicle.mileage || 0));
                  const today = new Date();
                  const returnDate = new Date(booking.endDate);
                  // Offer date update for both early and late returns
                  setReturnUpdateDate(today.toDateString() !== returnDate.toDateString());
                  setIsReturnModalOpen(true);
                }}
              >
                {t("bookings.completeReturn")}
              </Button>
              <Button
                fullWidth
                variant="danger"
                icon={<XCircle size={16} />}
                disabled={booking.status === "COMPLETED" || booking.status === "CANCELLED"}
                onClick={async () => {
                  if (!confirm(t("bookings.cancelConfirm"))) return;
                  const res = await updateBookingStatus(booking.id, "CANCELLED");
                  if (res.success) toast(t("toast.bookingCancelled"), "success");
                  else toast(res.message, "error");
                }}
              >
                {t("bookings.cancelBooking")}
              </Button>
            </div>
          </Card>

        </div>
      </div>

      {/* Activity Timeline */}
      <Card padding="lg" style={{ marginTop: "24px" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
          <FileText size={16} /> {t("bookings.activity")}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {(() => {
            // Build timeline events from available data
            const events: { date: string; label: string; detail: string; color: string; icon: string }[] = [];

            // 1. Booking created
            events.push({
              date: booking.createdAt,
              label: t("timeline.bookingCreated"),
              detail: `${booking.vehicle.brand} ${booking.vehicle.model} ${t("timeline.bookedFor")} ${getFullName(booking.customer.firstName, booking.customer.lastName)}`,
              color: "var(--info)",
              icon: "📝",
            });

            // 2. Invoice generated
            if (booking.invoice) {
              events.push({
                date: booking.invoice.createdAt,
                label: t("timeline.invoiceGenerated"),
                detail: `${t("timeline.total")}: ${formatCurrency(booking.invoice.totalAmount)} — ${t("timeline.deposit")}: ${formatCurrency(booking.invoice.depositPaid)}`,
                color: "var(--accent)",
                icon: "🧾",
              });

              // 3. Payment logs from invoice notes
              if (booking.invoice.notes) {
                const regex = /\[Payment: ([\d.]+) via ([A-Z]+)\]/g;
                let match;
                while ((match = regex.exec(booking.invoice.notes)) !== null) {
                  events.push({
                    date: booking.invoice.updatedAt,
                    label: t("timeline.paymentRecorded"),
                    detail: `${formatCurrency(parseFloat(match[1]))} via ${match[2]}`,
                    color: "var(--success)",
                    icon: "💳",
                  });
                }
              }

              // 4. If fully paid
              if (booking.invoice.paymentStatus === "PAID") {
                events.push({
                  date: booking.invoice.updatedAt,
                  label: t("timeline.fullyPaid"),
                  detail: t("timeline.fullyPaidDesc"),
                  color: "var(--success)",
                  icon: "✅",
                });
              }
            }

            // 5. Pickup (if active or completed)
            if (booking.status === "ACTIVE" || booking.status === "LATE" || booking.status === "COMPLETED") {
              events.push({
                date: booking.startDate,
                label: t("timeline.vehiclePickedUp"),
                detail: `${booking.vehicle.plateNumber} ${t("timeline.handedOverAt")} ${booking.pickupLocation || t("bookings.mainOffice")}`,
                color: "var(--success)",
                icon: "🚗",
              });
            }

            // 6. Return (if completed)
            if (booking.status === "COMPLETED") {
              events.push({
                date: booking.endDate,
                label: t("timeline.vehicleReturned"),
                detail: `${t("timeline.returnedAt")} ${booking.returnLocation || t("bookings.mainOffice")}`,
                color: "var(--info)",
                icon: "🏁",
              });
            }

            // 7. Cancelled
            if (booking.status === "CANCELLED") {
              events.push({
                date: booking.updatedAt,
                label: t("timeline.bookingCancelled"),
                detail: t("timeline.cancelledDesc"),
                color: "var(--danger)",
                icon: "❌",
              });
            }

            // Sort by date
            events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return events.map((ev, idx) => (
              <div key={idx} style={{ display: "flex", gap: "16px", position: "relative" }}>
                {/* Timeline line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "32px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: `${ev.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                    border: `2px solid ${ev.color}`,
                    zIndex: 1,
                  }}>
                    {ev.icon}
                  </div>
                  {idx < events.length - 1 && (
                    <div style={{ width: "2px", flex: 1, background: "var(--border)", minHeight: "20px" }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ paddingBottom: idx < events.length - 1 ? "20px" : "0", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: ev.color }}>{ev.label}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                      {formatDate(ev.date)}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
                    {ev.detail}
                  </p>
                </div>
              </div>
            ));
          })()}
        </div>
      </Card>

      <Modal 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)}
        title={t("invoices.generateInvoice")}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("invoices.subtotal")} ({days} {t("label.days")})</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(baseSubtotal)}</span>
            </div>
          </div>
          <Input 
            label={`${t("invoices.extraCharges")} (${currency})`} 
            type="number"
            min={0}
            value={invoiceForm.extraCharges}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, extraCharges: Number(e.target.value) })}
          />
          <Input 
            label={`${t("invoices.discount")} (${currency})`} 
            type="number"
            min={0}
            value={invoiceForm.discount}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: Number(e.target.value) })}
          />
          <Input 
            label={`${t("invoices.depositPaidUpfront")} (${currency})`} 
            type="number"
            min={0}
            value={invoiceForm.depositPaid}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, depositPaid: Number(e.target.value) })}
            hint={t("invoices.depositHint")}
          />
          <Textarea 
            label={t("invoices.invoiceNotes")}
            value={invoiceForm.notes}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
            placeholder={t("invoices.notesPlaceholder")}
            rows={2}
          />

          <div style={{ marginTop: "8px" }}>
            <Button fullWidth onClick={handleGenerateInvoice} loading={generating}>
              {t("invoices.confirmGenerate")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Early Pickup Modal */}
      <Modal
        isOpen={isEarlyPickupModalOpen}
        onClose={() => setIsEarlyPickupModalOpen(false)}
        title={`⚡ ${t("bookings.earlyPickup")}`}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "16px", background: "var(--warning-muted)", borderRadius: "8px", border: "1px solid var(--warning)", fontSize: "0.875rem", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--warning)" }}>{t("bookings.scheduledFor")} {formatDate(booking.startDate)}</strong>
            <p style={{ marginTop: "8px", color: "var(--text-secondary)" }}>
              {t("bookings.earlyPickupQuestion")}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Button
              fullWidth
              variant="primary"
              loading={pickupLoading}
              onClick={async () => {
                setPickupLoading(true);
                const res = await handleEarlyPickup(booking.id, true);
                setPickupLoading(false);
                if (res.success) {
                  toast(res.message, "success");
                  setIsEarlyPickupModalOpen(false);
                } else {
                  toast(res.message, "error");
                }
              }}
            >
              {t("bookings.updateDateInvoice")}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              loading={pickupLoading}
              onClick={async () => {
                setPickupLoading(true);
                const res = await handleEarlyPickup(booking.id, false);
                setPickupLoading(false);
                if (res.success) {
                  toast(res.message, "success");
                  setIsEarlyPickupModalOpen(false);
                } else {
                  toast(res.message, "error");
                }
              }}
            >
              {t("bookings.keepOriginalDates")}
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => setIsEarlyPickupModalOpen(false)}
            >
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Return Vehicle Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`🏁 ${t("bookings.returnVehicle")}`}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Early/Late return notice */}
          {returnUpdateDate && (() => {
            const isLate = new Date() > new Date(booking.endDate);
            return (
              <div style={{ padding: "16px", background: isLate ? "var(--danger-muted)" : "var(--info-muted)", borderRadius: "8px", border: `1px solid ${isLate ? "var(--danger)" : "var(--info)"}`, fontSize: "0.875rem", lineHeight: 1.5 }}>
                <strong style={{ color: isLate ? "var(--danger)" : "var(--info)" }}>
                  {isLate ? `⚠️ ${t("bookings.lateReturn")} ${formatDate(booking.endDate)}` : `${t("bookings.returningEarly")}: ${formatDate(booking.endDate)}`}
                </strong>
                <p style={{ marginTop: "8px", color: "var(--text-secondary)" }}>
                  {isLate
                    ? t("bookings.lateReturnQuestion")
                    : t("bookings.earlyReturnQuestion")}
                </p>
              </div>
            );
          })()}

          {/* Mileage input */}
          <div style={{ padding: "16px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.875rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("bookings.currentMileage")}</span>
              <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{(booking.vehicle.mileage || 0).toLocaleString()} km</span>
            </div>
            <Input
              label={t("bookings.newMileageKm")}
              type="number"
              required
              min={booking.vehicle.mileage || 0}
              value={returnMileage}
              onChange={(e) => setReturnMileage(e.target.value)}
              hint={t("bookings.mileageHint")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {returnUpdateDate ? (
              <>
                <Button
                  fullWidth
                  variant="primary"
                  loading={returnLoading}
                  onClick={async () => {
                    const mileage = validateReturnMileage();
                    if (mileage === null) return;
                    setReturnLoading(true);
                    const res = await handleReturn(booking.id, true, mileage);
                    setReturnLoading(false);
                    if (res.success) {
                      toast(res.message, "success");
                      setIsReturnModalOpen(false);
                    } else {
                      toast(res.message, "error");
                    }
                  }}
                >
                  {t("bookings.updateDateInvoice")}
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  loading={returnLoading}
                  onClick={async () => {
                    const mileage = validateReturnMileage();
                    if (mileage === null) return;
                    setReturnLoading(true);
                    const res = await handleReturn(booking.id, false, mileage);
                    setReturnLoading(false);
                    if (res.success) {
                      toast(res.message, "success");
                      setIsReturnModalOpen(false);
                    } else {
                      toast(res.message, "error");
                    }
                  }}
                >
                  {t("bookings.keepOrigDates")}
                </Button>
              </>
            ) : (
              <Button
                fullWidth
                variant="primary"
                loading={returnLoading}
                onClick={async () => {
                  const mileage = validateReturnMileage();
                  if (mileage === null) return;
                  setReturnLoading(true);
                  const res = await handleReturn(booking.id, false, mileage);
                  setReturnLoading(false);
                  if (res.success) {
                    toast(res.message, "success");
                    setIsReturnModalOpen(false);
                  } else {
                    toast(res.message, "error");
                  }
                }}
              >
                {t("bookings.confirmReturn")}
              </Button>
            )}
            <Button
              fullWidth
              variant="ghost"
              onClick={() => setIsReturnModalOpen(false)}
            >
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Drivers Modal */}
      <Modal
        isOpen={isEditDriversModalOpen}
        onClose={() => setIsEditDriversModalOpen(false)}
        title={t("bookings.editDriverInformation")}
        size="md"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>{t("bookings.primaryDriver")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
              <Input
                label={t("bookings.lastName")}
                value={driverForm.driverLastName}
                onChange={(e) => setDriverForm({ ...driverForm, driverLastName: e.target.value })}
              />
              <Input
                label={t("bookings.firstName")}
                value={driverForm.driverFirstName}
                onChange={(e) => setDriverForm({ ...driverForm, driverFirstName: e.target.value })}
              />
              <Input
                label={t("bookings.cinPassport")}
                value={driverForm.driverCIN}
                onChange={(e) => setDriverForm({ ...driverForm, driverCIN: e.target.value })}
              />
              <Input
                label={t("bookings.licenseNumber")}
                value={driverForm.driverLicense}
                onChange={(e) => setDriverForm({ ...driverForm, driverLicense: e.target.value })}
              />
            </div>
          </div>

          <div style={{ paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem" }}>{t("bookings.secondDriver")}</h3>
              {showSecondDriver ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowSecondDriver(false);
                    setDriverForm({
                      ...driverForm,
                      driver2FirstName: "",
                      driver2LastName: "",
                      driver2CIN: "",
                      driver2License: "",
                    });
                  }}
                >
                  {t("bookings.removeDriver")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={14} />}
                  onClick={() => setShowSecondDriver(true)}
                >
                  {t("bookings.addSecondDriver")}
                </Button>
              )}
            </div>

            {showSecondDriver && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                <Input
                  label={t("bookings.lastName")}
                  value={driverForm.driver2LastName}
                  onChange={(e) => setDriverForm({ ...driverForm, driver2LastName: e.target.value })}
                />
                <Input
                  label={t("bookings.firstName")}
                  value={driverForm.driver2FirstName}
                  onChange={(e) => setDriverForm({ ...driverForm, driver2FirstName: e.target.value })}
                />
                <Input
                  label={t("bookings.cinPassport")}
                  value={driverForm.driver2CIN}
                  onChange={(e) => setDriverForm({ ...driverForm, driver2CIN: e.target.value })}
                />
                <Input
                  label={t("bookings.licenseNumber")}
                  value={driverForm.driver2License}
                  onChange={(e) => setDriverForm({ ...driverForm, driver2License: e.target.value })}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <Button
              fullWidth
              variant="primary"
              loading={editDriversLoading}
              onClick={async () => {
                const payload = showSecondDriver
                  ? driverForm
                  : {
                      ...driverForm,
                      driver2FirstName: "",
                      driver2LastName: "",
                      driver2CIN: "",
                      driver2License: "",
                    };

                setEditDriversLoading(true);
                const res = await updateBookingDrivers(booking.id, payload);
                setEditDriversLoading(false);
                if (res.success) {
                  toast(t("toast.driverInfoUpdated"), "success");
                  setIsEditDriversModalOpen(false);
                  router.refresh();
                } else {
                  toast(t("toast.driverInfoUpdateFailed"), "error");
                }
              }}
            >
              {t("action.saveChanges")}
            </Button>
            <Button fullWidth variant="ghost" onClick={() => setIsEditDriversModalOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Dates Modal */}
      <Modal
        isOpen={isEditDatesModalOpen}
        onClose={() => setIsEditDatesModalOpen(false)}
        title={`📅 ${t("bookings.editBookingDates")}`}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            label={`${t("bookings.pricePerDay")} (${currency})`}
            type="number"
            min={0}
            step="0.01"
            value={editPricePerDay}
            onChange={(e) => setEditPricePerDay(Number(e.target.value))}
          />
          {booking.invoice && (
            <div style={{ padding: "8px 12px", background: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "0.8125rem", color: "var(--text-tertiary)", display: "flex", justifyContent: "space-between" }}>
              <span>{t("invoices.willRecalculate")}</span>
              <span>✓</span>
            </div>
          )}

          <Input
            label={t("bookings.pickupDate")}
            type="date"
            value={editStartDate}
            onChange={(e) => setEditStartDate(e.target.value)}
          />
          <Input
            label={t("bookings.returnDate")}
            type="date"
            value={editEndDate}
            onChange={(e) => setEditEndDate(e.target.value)}
          />

          {editPreviewDays > 0 && (
            <div style={{ padding: "12px", background: "var(--accent-muted)", borderRadius: "8px", fontSize: "0.875rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("bookings.newDurationTotal")}</span>
              <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                {editPreviewDays} {t("label.days")} - {formatCurrency(editPreviewDays * editPricePerDay)}
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              fullWidth
              variant="primary"
              loading={editDatesLoading}
              onClick={async () => {
                setEditDatesLoading(true);
                const res = await updateBookingDates(booking.id, editStartDate, editEndDate, editPricePerDay);
                setEditDatesLoading(false);
                if (res.success) {
                  toast(res.message, "success");
                  setIsEditDatesModalOpen(false);
                  router.refresh();
                } else {
                  toast(res.message, "error");
                }
              }}
            >
              {t("action.saveChanges")}
            </Button>
            <Button fullWidth variant="ghost" onClick={() => setIsEditDatesModalOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
