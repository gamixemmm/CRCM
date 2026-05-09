"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Filter, Search, ChevronRight, Undo2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import { translateExpenseCategory, translateExpenseDescription } from "@/lib/expenseCategories";
import type { TranslationKey } from "@/lib/translations";
import { undoAuditLogAction } from "@/actions/auditLogs";
import { useToast } from "@/components/ui/Toast";
import styles from "./logs.module.css";

type AuditLog = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  canUndo?: boolean;
  undoDone?: boolean;
};

export default function LogsClient({ logs }: { logs: AuditLog[] }) {
  const { t, formatPrice } = useSettings();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("All");
  const [action, setAction] = useState("All");
  const [entityType, setEntityType] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [undoingLogId, setUndoingLogId] = useState<string | null>(null);

  const actors = useMemo(() => {
    const values = new Map<string, string>();
    logs.forEach((log) => {
      const key = log.actorId || log.actorEmail || "system";
      values.set(key, log.actorName || log.actorEmail || t("logs.system"));
    });
    return [["All", t("label.all")], ...Array.from(values.entries()).sort((a, b) => a[1].localeCompare(b[1]))];
  }, [logs, t]);

  const actions = useMemo(() => ["All", ...Array.from(new Set(logs.map((log) => log.action))).sort()], [logs]);
  const entityTypes = useMemo(() => ["All", ...Array.from(new Set(logs.map((log) => log.entityType).filter(Boolean) as string[])).sort()], [logs]);

  const getMetadataString = (log: AuditLog, key: string) => {
    const value = log.metadata?.[key];
    return typeof value === "string" && value ? value : null;
  };

  const getMetadataNumber = (log: AuditLog, key: string) => {
    const value = log.metadata?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };

  const formatEntityType = (entityType: string | null) => {
    const labels: Record<string, TranslationKey> = {
      Account: "logs.entity.account",
      AuditLog: "logs.entity.auditLog",
      Booking: "logs.entity.booking",
      CarInstallmentPayment: "logs.entity.carInstallmentPayment",
      Company: "logs.entity.company",
      Customer: "logs.entity.customer",
      Employee: "logs.entity.employee",
      EmployeeAccount: "logs.entity.employeeAccount",
      EmployeeRole: "logs.entity.employeeRole",
      EmployeeSalaryPayment: "logs.entity.employeeSalaryPayment",
      Expense: "logs.entity.expense",
      GlobalSettings: "logs.entity.globalSettings",
      InsurancePayment: "logs.entity.insurancePayment",
      Invoice: "logs.entity.invoice",
      Maintenance: "logs.entity.maintenance",
      TechnicalInspection: "logs.entity.technicalInspection",
      Vehicle: "logs.entity.vehicle",
      VignettePayment: "logs.entity.vignettePayment",
    };

    return entityType ? (labels[entityType] ? t(labels[entityType]) : entityType.replace(/([a-z])([A-Z])/g, "$1 $2")) : "-";
  };

  const formatAction = (action: string) => {
    const labels: Record<string, TranslationKey> = {
      ADD_CASH_REGISTER_AMOUNT: "logs.action.addedCash",
      COMPLETE_TECHNICAL_INSPECTION: "logs.action.completedTechnicalInspection",
      CREATE_EXPENSE: "logs.action.addedExpense",
      UPDATE_EXPENSE: "logs.action.updatedExpense",
      DELETE_EXPENSE: "logs.action.deletedExpense",
      CREATE_MAINTENANCE: "logs.action.addedMaintenance",
      UPDATE_MAINTENANCE: "logs.action.updatedMaintenance",
      RESOLVE_MAINTENANCE: "logs.action.resolvedMaintenance",
      UNRESOLVE_MAINTENANCE: "logs.action.reopenedMaintenance",
      DELETE_MAINTENANCE: "logs.action.deletedMaintenance",
      CREATE_VEHICLE: "logs.action.addedVehicle",
      UPDATE_VEHICLE: "logs.action.updatedVehicle",
      DELETE_VEHICLE: "logs.action.deletedVehicle",
      IMPORT_VEHICLES: "logs.action.importedVehicles",
      CREATE_BOOKING: "logs.action.addedBooking",
      UPDATE_BOOKING: "logs.action.updatedBooking",
      UPDATE_BOOKING_STATUS: "logs.action.updatedBookingStatus",
      UPDATE_BOOKING_DATES: "logs.action.updatedBookingDates",
      UPDATE_BOOKING_DRIVERS: "logs.action.updatedBookingDrivers",
      EARLY_PICKUP: "logs.action.earlyPickup",
      RETURN_BOOKING: "logs.action.returnedBooking",
      DELETE_BOOKING: "logs.action.deletedBooking",
      CREATE_CUSTOMER: "logs.action.addedCustomer",
      CREATE_BROKER: "logs.action.addedBroker",
      UPDATE_CUSTOMER: "logs.action.updatedCustomer",
      DELETE_CUSTOMER: "logs.action.deletedCustomer",
      REMOVE_CASH_REGISTER_AMOUNT: "logs.action.removedCash",
      UPDATE_CASH_REGISTER: "logs.action.updatedCashRegister",
      CREATE_INVOICE: "logs.action.createdInvoice",
      UPDATE_INVOICE_PAYMENT: "logs.action.paymentRecorded",
      DELETE_INVOICE: "logs.action.deletedInvoice",
      CREATE_EMPLOYEE: "logs.action.createdEmployee",
      UPDATE_EMPLOYEE: "logs.action.updatedEmployee",
      DELETE_EMPLOYEE: "logs.action.deletedEmployee",
      CREATE_EMPLOYEE_ACCOUNT: "logs.action.createdEmployeeAccount",
      UPDATE_EMPLOYEE_ACCOUNT: "logs.action.updatedEmployeeAccount",
      CREATE_EMPLOYEE_ROLE: "logs.action.createdEmployeeRole",
      UPDATE_EMPLOYEE_ROLE: "logs.action.updatedEmployeeRole",
      DELETE_EMPLOYEE_ROLE: "logs.action.deletedEmployeeRole",
      CREATE_DEMO_COMPANY: "logs.action.createdDemoCompany",
      EXPORT_COMPANY_DATA: "logs.action.exportedCompanyData",
      LOGIN: "logs.action.login",
      LOGOUT: "logs.action.logout",
      MARK_VIGNETTE_PAID: "logs.action.markedVignettePaid",
      RECORD_INSURANCE_PAYMENT: "logs.action.recordedInsurancePayment",
      UPDATE_USER_SETTINGS: "logs.action.updatedUserSettings",
      UPSERT_CAR_INSTALLMENT_PAYMENT: "logs.action.updatedCarInstallment",
      UNDO_ACTION: "logs.action.undidAction",
    };
    const key = labels[action];

    return key ? t(key) : action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatActorRole = (role: string | null) => {
    if (!role) return "-";
    if (role === "Administrator") return t("logs.role.administrator");
    if (role === "Employee") return t("logs.role.employee");
    return role;
  };

  const formatLogMessage = (log: AuditLog) => {
    const vehiclePlate = getMetadataString(log, "vehiclePlate");
    const vehicleBrand = getMetadataString(log, "vehicleBrand");
    const vehicleModel = getMetadataString(log, "vehicleModel");
    const vehicleLabel = vehiclePlate
      ? `${vehiclePlate}${vehicleBrand || vehicleModel ? ` - ${[vehicleBrand, vehicleModel].filter(Boolean).join(" ")}` : ""}`
      : null;

    if (log.entityType === "Maintenance" && vehicleLabel) {
      return `${formatAction(log.action)} ${t("logs.message.for")} ${vehicleLabel}`;
    }

    if (log.entityType === "Booking") {
      const driverName = getMetadataString(log, "bookingDriverName");
      const amount = getMetadataNumber(log, "bookingTotalAmount") ?? getMetadataNumber(log, "totalAmount");
      const detailParts = [
        driverName,
        amount !== null ? formatPrice(amount) : null,
      ].filter(Boolean);

      if (vehicleLabel) {
        return `${formatAction(log.action)} ${t("logs.message.for")} ${vehicleLabel}${detailParts.length > 0 ? ` - ${detailParts.join(" - ")}` : ""}`;
      }

      if (detailParts.length > 0) {
        return `${formatAction(log.action)} - ${detailParts.join(" - ")}`;
      }
    }

    if (log.entityType === "Invoice" && log.action === "UPDATE_INVOICE_PAYMENT") {
      const driverName = getMetadataString(log, "invoiceDriverName");
      const amount = getMetadataNumber(log, "amountPaid");
      const detailParts = [
        driverName,
        amount !== null ? `${t("logs.message.amountAdded")}: ${formatPrice(amount)}` : null,
      ].filter(Boolean);

      if (vehicleLabel) {
        return `${formatAction(log.action)} ${t("logs.message.invoiceOfBooking")} ${vehicleLabel}${detailParts.length > 0 ? ` - ${detailParts.join(" - ")}` : ""}`;
      }

      if (detailParts.length > 0) {
        return `${formatAction(log.action)} - ${detailParts.join(" - ")}`;
      }
    }

    if (log.entityType === "Expense") {
      const description = translateExpenseDescription(
        getMetadataString(log, "expenseDescription") || getMetadataString(log, "description"),
        t
      );
      const category = getMetadataString(log, "expenseCategory") || getMetadataString(log, "category");
      const amount = getMetadataNumber(log, "expenseAmount") ?? getMetadataNumber(log, "amount");
      const detailParts = [
        description || (category ? translateExpenseCategory(category, t) : null),
        amount !== null ? formatPrice(amount) : null,
      ].filter(Boolean);

      if (vehicleLabel) {
        return `${formatAction(log.action)} ${t("logs.message.for")} ${vehicleLabel}${detailParts.length > 0 ? ` - ${detailParts.join(" - ")}` : ""}`;
      }

      if (detailParts.length > 0) {
        return `${formatAction(log.action)} - ${detailParts.join(" - ")}`;
      }
    }

    if (log.entityType === "Vehicle" && vehicleLabel) {
      return `${formatAction(log.action)}: ${vehicleLabel}`;
    }

    if (log.action === "UNDO_ACTION") {
      const originalAction = getMetadataString(log, "originalAction");
      return originalAction ? `${formatAction(log.action)}: ${formatAction(originalAction)}` : formatAction(log.action);
    }

    return formatAction(log.action);
  };

  const term = search.trim().toLowerCase();
  const filteredLogs = logs.filter((log) => {
    const actorKey = log.actorId || log.actorEmail || "system";
    const createdDate = new Date(log.createdAt).toISOString().split("T")[0];
    const matchesSearch =
      !term ||
      log.message.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      formatAction(log.action).toLowerCase().includes(term) ||
      formatLogMessage(log).toLowerCase().includes(term) ||
      (log.actorName || "").toLowerCase().includes(term) ||
      (log.actorEmail || "").toLowerCase().includes(term) ||
      (log.entityType || "").toLowerCase().includes(term) ||
      (log.entityId || "").toLowerCase().includes(term);

    return (
      matchesSearch &&
      (actor === "All" || actorKey === actor) &&
      (action === "All" || log.action === action) &&
      (entityType === "All" || log.entityType === entityType) &&
      (!startDate || createdDate >= startDate) &&
      (!endDate || createdDate <= endDate)
    );
  });

  const getLogHref = (log: AuditLog) => {
    const entityType = log.entityType;
    const entityId = log.entityId;
    const bookingId = getMetadataString(log, "bookingId");
    const vehicleId = getMetadataString(log, "vehicleId");

    if (entityType === "Invoice" && log.action === "DELETE_INVOICE" && bookingId) return `/bookings/${bookingId}`;

    if (entityType === "Booking" && entityId) return `/bookings/${entityId}`;
    if (entityType === "Invoice" && entityId) return `/invoices/${entityId}`;
    if (entityType === "Maintenance" && entityId && !log.action.startsWith("DELETE_")) return `/maintenance/${entityId}`;
    if (entityType === "Vehicle" && entityId && !log.action.startsWith("DELETE_")) return `/vehicles/${entityId}`;
    if (entityType === "Customer" && entityId) return `/customers/${entityId}`;
    if (entityType === "Expense" && entityId && !log.action.startsWith("DELETE_")) return `/expenses/${entityId}`;

    if (entityType === "Maintenance") return "/maintenance";
    if (entityType === "Vehicle") return vehicleId ? `/vehicles/${vehicleId}` : "/vehicles";
    if (entityType === "Expense" || entityType === "GlobalSettings") return "/expenses";
    if (entityType === "Employee" || entityType === "EmployeeSalaryPayment" || entityType === "EmployeeAccount") return "/employees";
    if (entityType === "EmployeeRole") return "/settings";
    if (entityType === "VignettePayment") return "/vignette";
    if (entityType === "InsurancePayment") return "/insurance";
    if (entityType === "TechnicalInspection") return "/technical-inspection";
    if (entityType === "Company" || entityType === "Account") return "/settings";
    if (bookingId) return `/bookings/${bookingId}`;
    if (vehicleId) return `/vehicles/${vehicleId}`;

    return null;
  };

  const openLogTarget = (log: AuditLog) => {
    const href = getLogHref(log);
    if (href) router.push(href);
  };

  const handleUndo = async (log: AuditLog) => {
    if (!window.confirm(t("logs.undoConfirm"))) return;
    setUndoingLogId(log.id);
    const result = await undoAuditLogAction(log.id);
    setUndoingLogId(null);
    toast(result.success ? t("logs.undoSuccess") : result.message || t("logs.undoFailed"), result.success ? "success" : "error");
    if (result.success) router.refresh();
  };

  const columns = [
    {
      key: "createdAt",
      label: t("logs.time"),
      render: (log: AuditLog) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "actor",
      label: t("logs.user"),
      render: (log: AuditLog) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <strong>{log.actorName || log.actorEmail || t("logs.system")}</strong>
          <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>{formatActorRole(log.actorRole)}</span>
        </div>
      ),
    },
    {
      key: "action",
      label: t("logs.action"),
      render: (log: AuditLog) => <Badge variant="info">{formatAction(log.action)}</Badge>,
    },
    {
      key: "entity",
      label: t("logs.entity"),
      render: (log: AuditLog) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <strong>{formatEntityType(log.entityType)}</strong>
          <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>
            {getMetadataString(log, "vehiclePlate") || log.entityId || ""}
          </span>
        </div>
      ),
    },
    {
      key: "message",
      label: t("logs.message"),
      render: (log: AuditLog) => <span>{formatLogMessage(log)}</span>,
    },
    {
      key: "undo",
      label: t("logs.undo"),
      align: "right" as const,
      render: (log: AuditLog) => (
        log.canUndo ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={<Undo2 size={14} />}
            loading={undoingLogId === log.id}
            onClick={(event) => {
              event.stopPropagation();
              handleUndo(log);
            }}
          >
            {t("logs.undo")}
          </Button>
        ) : log.undoDone ? (
          <Badge variant="success">{t("logs.undone")}</Badge>
        ) : (
          <span style={{ color: "var(--text-tertiary)" }}>-</span>
        )
      ),
    },
  ];

  const mobileCards = filteredLogs.map((log) => {
    const href = getLogHref(log);
    return (
    <Card key={log.id} hover={Boolean(href)} padding="md" className={styles.mobileCard} onClick={href ? () => router.push(href) : undefined}>
      <div className={styles.mobileCardTop}>
        <div className={styles.mobileTopText}>
          <div className={styles.mobileAction}>
            <Activity size={14} />
            <span>{formatAction(log.action)}</span>
          </div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {formatEntityType(log.entityType)}
          </div>
        </div>
        <Badge variant="info">{formatDate(log.createdAt)}</Badge>
      </div>

      <div className={styles.mobileMetaGrid}>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("logs.user")}</span>
          <span className={styles.mobileMetaValue}>{log.actorName || log.actorEmail || t("logs.system")}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("logs.entity")}</span>
          <span className={styles.mobileMetaValue}>{getMetadataString(log, "vehiclePlate") || log.entityId || "-"}</span>
        </div>
      </div>

      <div className={styles.mobileMessage}>{formatLogMessage(log)}</div>

      <div className={styles.mobileFooter}>
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
          {formatActorRole(log.actorRole)}
        </div>
        {log.canUndo ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={<Undo2 size={14} />}
            loading={undoingLogId === log.id}
            onClick={(event) => {
              event.stopPropagation();
              handleUndo(log);
            }}
          >
            {t("logs.undo")}
          </Button>
        ) : log.undoDone ? (
          <Badge variant="success">{t("logs.undone")}</Badge>
        ) : (
          <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
        )}
      </div>
    </Card>
  );
  });

  return (
    <div className="animate-fade-in">
      <div className={`page-header ${styles.pageHeader}`}>
        <h1>
          <Activity size={24} />
          {t("logs.title")}
        </h1>
      </div>

      <Card padding="md" className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <Input label={t("action.search")} icon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("logs.searchPlaceholder")} />
          <Select label={t("logs.user")} icon={<Filter size={16} />} value={actor} onChange={(e) => setActor(e.target.value)}>
            {actors.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select label={t("logs.action")} value={action} onChange={(e) => setAction(e.target.value)}>
            {actions.map((value) => <option key={value} value={value}>{value === "All" ? t("label.all") : formatAction(value)}</option>)}
          </Select>
          <Select label={t("logs.entity")} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            {entityTypes.map((value) => <option key={value} value={value}>{value === "All" ? t("label.all") : formatEntityType(value)}</option>)}
          </Select>
          <Input label={t("logs.from")} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label={t("logs.to")} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setActor("All");
              setAction("All");
              setEntityType("All");
              setStartDate("");
              setEndDate("");
            }}
          >
            {t("calendar.clear")}
          </Button>
        </div>
      </Card>

      <div className={styles.desktopTable}>
        <Table columns={columns} data={filteredLogs} keyExtractor={(log) => log.id} onRowClick={openLogTarget} emptyMessage={t("logs.empty")} />
      </div>

      <div className={styles.mobileList}>
        {mobileCards}
        {filteredLogs.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <Activity size={44} />
            <h3>{t("logs.empty")}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
