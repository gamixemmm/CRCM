"use client";
import { useSettings } from "@/lib/SettingsContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Plus, Search, Car, User, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { getBookingsPdfExportData } from "@/actions/bookings";
import { createBookingsReportPdf } from "@/lib/simplePdf";
import { formatDate, formatStatus, getStatusColor, getStatusBg, getFullName } from "@/lib/utils";
import styles from "./bookings.module.css";
const statusFilters = ["ALL", "PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"];

interface BookingsClientProps {
  bookings: any[];
  vehicles: any[];
  maintenanceLogs: any[];
}

export default function BookingsClient({ bookings, vehicles, maintenanceLogs }: BookingsClientProps) {
  const { formatPrice: formatCurrency, t, formatStatusT, language } = useSettings();

  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [exporting, setExporting] = useState(false);
  const [lookupVehicleId, setLookupVehicleId] = useState("");
  const [lookupDate, setLookupDate] = useState("");

  const filtered = bookings.filter((b) => {
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      b.customer.firstName.toLowerCase().includes(term) ||
      b.customer.lastName.toLowerCase().includes(term) ||
      (b.driverFirstName?.toLowerCase().includes(term) ?? false) ||
      (b.driverLastName?.toLowerCase().includes(term) ?? false) ||
      b.vehicle.plateNumber.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const lookupResults = lookupVehicleId && lookupDate
    ? bookings.filter((booking) => {
        if (booking.vehicleId !== lookupVehicleId) return false;
        const dayStart = new Date(`${lookupDate}T00:00:00`);
        const dayEnd = new Date(`${lookupDate}T23:59:59.999`);
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);
        return bookingStart <= dayEnd && bookingEnd >= dayStart;
      })
    : [];

  const lookupMaintenanceResults = lookupVehicleId && lookupDate
    ? maintenanceLogs.filter((log) => {
        if (log.vehicleId !== lookupVehicleId) return false;
        const dayStart = new Date(`${lookupDate}T00:00:00`);
        const dayEnd = new Date(`${lookupDate}T23:59:59.999`);
        const serviceDate = new Date(log.serviceDate);
        const returnDate = log.returnDate ? new Date(log.returnDate) : dayEnd;
        return serviceDate <= dayEnd && returnDate >= dayStart;
      })
    : [];

  const selectedLookupVehicle = vehicles.find((vehicle) => vehicle.id === lookupVehicleId);

  const handleExportActiveBookings = async () => {
    setExporting(true);
    const result = await getBookingsPdfExportData();
    setExporting(false);

    if (!result.success || !result.data) {
      toast(result.message || "Failed to export bookings PDF.", "error");
      return;
    }

    const pdf = createBookingsReportPdf({
      ...result.data,
      locale: language === "fr" ? "fr-FR" : language === "ar" ? "ar-MA" : "en-GB",
      labels: {
        title: t("bookings.activeReportTitle"),
        generated: t("bookings.reportGenerated"),
        summary: (activeCount, availableCount) =>
          `${activeCount} ${t("bookings.activeBookings")} / ${availableCount} ${t("bookings.availableCars")}`,
        activeBookings: t("bookings.activeBookings"),
        availableCars: t("bookings.availableCars"),
        maintenanceCars: t("bookings.reportMaintenanceCars"),
        todayInvoices: t("bookings.reportTodayInvoices"),
        weekInvoices: t("bookings.reportWeekInvoices"),
        noRecords: t("bookings.reportNoRecords"),
        columns: {
          number: "#",
          vehicle: t("bookings.vehicle"),
          plate: t("vehicles.plate"),
          driver: t("bookings.primaryDriver"),
          broker: t("bookings.broker"),
          dates: t("bookings.reportDates"),
          payment: t("invoices.paymentStatus"),
          year: t("vehicles.year"),
          color: t("vehicles.color"),
          mileage: t("vehicles.mileage"),
          rate: t("vehicles.dailyRate"),
        },
        fallback: {
          pending: formatStatusT("PENDING"),
          perDay: t("bookings.reportPerDay"),
        },
        paymentStatuses: {
          PENDING: formatStatusT("PENDING"),
          PARTIAL: formatStatusT("PARTIAL"),
          PAID: formatStatusT("PAID"),
        },
        fields: {
          total: t("bookings.totalAmount"),
          paid: t("invoices.totalPaid"),
          due: t("invoices.amountDue"),
          method: t("invoices.paymentMethod"),
          status: t("invoices.paymentStatus"),
          pickup: t("bookings.pickup"),
          return: t("bookings.return"),
          phone: t("label.phone"),
          cin: t("bookings.cinPassport"),
          license: t("bookings.licenseNumber"),
          secondDriver: t("bookings.secondDriver"),
          company: t("bookings.company"),
          ice: t("bookings.companyICE"),
          notes: t("label.notes"),
          year: t("vehicles.year"),
          color: t("vehicles.color"),
          mileage: t("vehicles.mileage"),
          customer: t("bookings.customer"),
          invoice: t("nav.invoices"),
          income: t("dashboard.overallRevenue"),
          created: t("bookings.reportGenerated"),
          service: t("maintenance.serviceDate"),
          provider: t("maintenance.provider"),
          cost: t("maintenance.cost"),
        },
      },
    });
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `active-bookings-${date}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(t("bookings.exportSuccess"), "success");
  };

  const columns = [
    {
      key: "vehicle",
      label: t("bookings.vehicle"),
      render: (b: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ padding: "8px", background: "var(--bg-tertiary)", borderRadius: "6px" }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{b.vehicle.brand} {b.vehicle.model}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{b.vehicle.plateNumber}</div>
          </div>
        </div>
      ),
    },
    {
      key: "broker",
      label: t("bookings.broker"),
      render: (b: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <User size={14} style={{ color: "var(--text-tertiary)" }} />
          <span>{getFullName(b.customer.firstName, b.customer.lastName)}</span>
        </div>
      ),
    },
    {
      key: "customer",
      label: t("bookings.customer"),
      render: (b: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <User size={14} style={{ color: "var(--text-tertiary)" }} />
          <span>
            {b.driverFirstName || b.driverLastName
              ? getFullName(b.driverFirstName || "", b.driverLastName || "")
              : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "dates",
      label: t("bookings.duration"),
      render: (b: any) => (
        <div>
          <div style={{ fontSize: "0.8125rem" }}>{formatDate(b.startDate)}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{t("label.to")} {formatDate(b.endDate)}</div>
        </div>
      ),
    },
    {
      key: "totalAmount",
      label: t("bookings.totalAmount"),
      render: (b: any) => (
        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
          {formatCurrency(b.totalAmount)}
        </span>
      ),
    },
    {
      key: "status",
      label: t("label.status"),
      render: (b: any) => (
        <Badge color={getStatusColor(b.status)} bg={getStatusBg(b.status)} dot>
          {formatStatusT(b.status)}
        </Badge>
      ),
    },
  ];

  const mobileCards = filtered.map((b) => (
    <Card
      key={b.id}
      hover
      padding="md"
      className={styles.mobileCard}
      onClick={() => router.push(`/bookings/${b.id}`)}
    >
      <div className={styles.mobileCardHeader}>
        <div className={styles.mobileTitle}>
          <strong>{b.vehicle.brand} {b.vehicle.model}</strong>
          <span>{b.vehicle.plateNumber}</span>
        </div>
        <Badge color={getStatusColor(b.status)} bg={getStatusBg(b.status)} dot>
          {formatStatusT(b.status)}
        </Badge>
      </div>

      <div className={styles.mobileMetaGrid}>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("bookings.broker")}</span>
          <span className={styles.mobileMetaValue}>{getFullName(b.customer.firstName, b.customer.lastName)}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("bookings.customer")}</span>
          <span className={styles.mobileMetaValue}>
            {b.driverFirstName || b.driverLastName
              ? getFullName(b.driverFirstName || "", b.driverLastName || "")
              : "-"}
          </span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("bookings.duration")}</span>
          <span className={styles.mobileMetaValue}>{formatDate(b.startDate)} {t("label.to")} {formatDate(b.endDate)}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("bookings.totalAmount")}</span>
          <span className={styles.mobileMetaValue}>{formatCurrency(b.totalAmount)}</span>
        </div>
      </div>

      <div className={styles.mobileFooter}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
          <CalendarDays size={14} />
          {formatDate(b.startDate)}
        </div>
        <Link href={`/bookings/${b.id}`} onClick={(e) => e.stopPropagation()} className={styles.mobileLink}>
          {t("action.view")}
        </Link>
      </div>
    </Card>
  ));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <CalendarDays size={24} />
          {t("bookings.title")}
        </h1>
        <div className="page-header-actions">
          <Button
            type="button"
            variant="secondary"
            icon={<Download size={16} />}
            loading={exporting}
            onClick={handleExportActiveBookings}
          >
            {t("bookings.exportActivePdf")}
          </Button>
          <Link href="/bookings/new">
            <Button icon={<Plus size={16} />}>{t("bookings.newBooking")}</Button>
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "250px", maxWidth: "400px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder={t("bookings.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", height: "40px", padding: "0 12px 0 36px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
          />
        </div>

        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px",
                background: statusFilter === s ? "var(--accent-muted)" : "transparent",
                color: statusFilter === s ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${statusFilter === s ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s === "ALL" ? t("label.all") : formatStatusT(s)}
            </button>
          ))}
        </div>
      </div>

      <Card padding="md" className={styles.vehicleDateLookup}>
        <div className={styles.lookupHeader}>
          <div>
            <h3>{t("bookings.vehicleDateSearch")}</h3>
            <p>{t("bookings.vehicleDateSearchDesc")}</p>
          </div>
          {(lookupVehicleId || lookupDate) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setLookupVehicleId("");
                setLookupDate("");
              }}
            >
              {t("calendar.clear")}
            </Button>
          )}
        </div>

        <div className={styles.lookupControls}>
          <label className={styles.lookupField}>
            <span>{t("bookings.vehicle")}</span>
            <select value={lookupVehicleId} onChange={(e) => setLookupVehicleId(e.target.value)}>
              <option value="">{t("bookings.selectVehicle")}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} {vehicle.model} - {vehicle.plateNumber}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.lookupField}>
            <span>{t("label.date")}</span>
            <input type="date" value={lookupDate} onChange={(e) => setLookupDate(e.target.value)} />
          </label>
        </div>

        {lookupVehicleId && lookupDate && (
          <div className={styles.lookupResults}>
            <div className={styles.lookupResultsTitle}>
              {selectedLookupVehicle
                ? `${selectedLookupVehicle.brand} ${selectedLookupVehicle.model} - ${selectedLookupVehicle.plateNumber}`
                : t("bookings.vehicle")}
              <span>{formatDate(`${lookupDate}T00:00:00`)}</span>
            </div>

            {lookupResults.length > 0 || lookupMaintenanceResults.length > 0 ? (
              <>
                {lookupResults.map((booking) => (
                  <button
                    key={`booking-${booking.id}`}
                    type="button"
                    className={styles.lookupResult}
                    onClick={() => router.push(`/bookings/${booking.id}`)}
                  >
                    <div>
                      <strong>
                        {booking.driverFirstName || booking.driverLastName
                          ? getFullName(booking.driverFirstName || "", booking.driverLastName || "")
                          : getFullName(booking.customer.firstName, booking.customer.lastName)}
                      </strong>
                      <span>
                        {formatDate(booking.startDate)} {t("label.to")} {formatDate(booking.endDate)}
                      </span>
                    </div>
                    <Badge color={getStatusColor(booking.status)} bg={getStatusBg(booking.status)} dot>
                      {formatStatusT(booking.status)}
                    </Badge>
                  </button>
                ))}
                {lookupMaintenanceResults.map((log) => (
                  <button
                    key={`maintenance-${log.id}`}
                    type="button"
                    className={styles.lookupResult}
                    onClick={() => router.push(`/maintenance/${log.id}`)}
                  >
                    <div>
                      <strong>{log.type || t("nav.maintenance")}</strong>
                      <span>
                        {formatDate(log.serviceDate)} {t("label.to")} {log.returnDate ? formatDate(log.returnDate) : t("maintenance.stillInShop")}
                      </span>
                    </div>
                    <Badge color="var(--warning)" bg="var(--warning-muted)" dot>
                      {t("nav.maintenance")}
                    </Badge>
                  </button>
                ))}
              </>
            ) : (
              <div className={styles.lookupEmpty}>{t("bookings.noVehicleDateRecords")}</div>
            )}
          </div>
        )}
      </Card>

      <div className={styles.desktopTable}>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(b) => b.id}
          onRowClick={(b) => router.push(`/bookings/${b.id}`)}
          emptyMessage={t("bookings.noBookings")}
        />
      </div>
      <div className={styles.mobileList}>
        {mobileCards}
        {filtered.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <CalendarDays size={44} />
            <h3>{t("bookings.noBookings")}</h3>
            <p>{t("bookings.searchPlaceholder")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
