"use client";
import { useSettings } from "@/lib/SettingsContext";
import { hasPermission } from "@/lib/permissions";

import Link from "next/link";
import {
  Car,
  CalendarDays,
  Users,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Clock,
  Plus,
  CheckCircle,
  Key,
  CreditCard,
  Calculator,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatDate, formatStatus, getStatusColor, getStatusBg, getFullName } from "@/lib/utils";
import { translateMaintenanceText } from "@/lib/maintenanceDetails";
import styles from "./dashboard.module.css";

interface BookingRow {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
  customer: { firstName: string; lastName: string };
  vehicle: { brand: string; model: string; plateNumber: string };
}

interface DashboardClientProps {
  stats: {
    vehicleCount: number;
    availableCount: number;
    rentedCount: number;
    maintenanceCount: number;
    activeBookings: number;
    totalCustomers: number;
    overallRevenue: number;
    pendingRevenue: number;
    remainder: number;
  };
  recentBookings: BookingRow[];
  todayPickups: BookingRow[];
  todayReturns: BookingRow[];
  todayMaintenanceIn: any[];
  todayMaintenanceOut: any[];
  session: { role?: string; permissions?: string[] } | null;
}

export default function DashboardClient({
  stats,
  recentBookings,
  todayPickups,
  todayReturns,
  todayMaintenanceIn,
  todayMaintenanceOut,
  session,
}: DashboardClientProps) {
  const { formatPrice: formatCurrency, t, formatStatusT } = useSettings();

  const getDayLabel = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return t("dashboard.today");
    }
    return t("dashboard.tomorrow");
  };

  const statCards: { label: string; value: string | number; icon: React.ReactNode; color: string; bg: string; href: string }[] = [
    {
      label: t("dashboard.totalVehicles"),
      value: stats.vehicleCount,
      icon: <Car size={22} />,
      color: "var(--accent)",
      bg: "var(--accent-muted)",
      href: "/vehicles",
    },
    {
      label: t("dashboard.availableVehicles"),
      value: stats.availableCount,
      icon: <CheckCircle size={22} />,
      color: "var(--success)",
      bg: "var(--success-muted)",
      href: "/vehicles?status=AVAILABLE",
    },
    {
      label: t("dashboard.rentedVehicles"),
      value: stats.rentedCount,
      icon: <Key size={22} />,
      color: "var(--warning)",
      bg: "var(--warning-muted)",
      href: "/vehicles?status=RENTED",
    },
  ];

  if (hasPermission(session, "VIEW_OVERALL_REVENUE")) {
    statCards.push({
      label: t("dashboard.overallRevenue"),
      value: formatCurrency(stats.overallRevenue),
      icon: <DollarSign size={22} />,
      color: "var(--info)",
      bg: "var(--info-muted)",
      href: "/invoices",
    });
  }

  if (hasPermission(session, "VIEW_PENDING_REVENUE")) {
    statCards.push({
      label: t("dashboard.howMuchRevenue"),
      value: formatCurrency(stats.pendingRevenue),
      icon: <CreditCard size={22} />,
      color: "var(--danger)",
      bg: "var(--danger-muted)",
      href: "/invoices?status=UNPAID",
    });
  }

  if (hasPermission(session, "VIEW_EXPENSES") || hasPermission(session, "MANAGE_EXPENSES")) {
    statCards.push({
      label: t("expenses.remainder"),
      value: formatCurrency(stats.remainder),
      icon: <Calculator size={22} />,
      color: stats.remainder < 0 ? "var(--danger)" : "var(--success)",
      bg: stats.remainder < 0 ? "var(--danger-muted)" : "var(--success-muted)",
      href: "/expenses",
    });
  }

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.welcomeTitle}>{t("dashboard.welcome")} 👋</h1>
          <p className={styles.welcomeSub}>
            {t("dashboard.fleetSubtitle")}
          </p>
        </div>
        <div className={styles.quickActions}>
          <Link href="/bookings/new">
            <Button icon={<Plus size={16} />}>{t("bookings.newBooking")}</Button>
          </Link>
          <Link href="/vehicles/new">
            <Button variant="secondary" icon={<Plus size={16} />}>{t("vehicles.addVehicle")}</Button>
          </Link>
        </div>
      </div>



      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <Link href={s.href} key={s.label} className={styles.statLink}>
            <Card hover padding="md" className={styles.statTicker}>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ color: s.color, background: s.bg }}>
                  {s.icon}
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue} style={{ color: s.color }}>
                    {typeof s.value === "number" ? s.value : s.value}
                  </div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
                <ArrowRight size={16} className={styles.statArrow} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Fleet Overview Mini */}
      <div className={styles.fleetBar}>
        <Card padding="md">
          <div className={styles.fleetHeader}>
            <h3>{t("dashboard.fleetStatus")}</h3>
            <Link href="/vehicles" className={styles.viewAll}>
              {t("action.viewAll")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className={styles.fleetStats}>
            <Link href="/vehicles?status=AVAILABLE" className={styles.fleetStat} style={{ textDecoration: "none", color: "inherit" }}>
              <span className={styles.fleetDot} style={{ background: "var(--success)" }} />
              <span className={styles.fleetCount}>{stats.availableCount}</span>
              <span className={styles.fleetLabel}>{t("status.available")}</span>
            </Link>
            <Link href="/vehicles?status=RENTED" className={styles.fleetStat} style={{ textDecoration: "none", color: "inherit" }}>
              <span className={styles.fleetDot} style={{ background: "var(--accent)" }} />
              <span className={styles.fleetCount}>{stats.rentedCount}</span>
              <span className={styles.fleetLabel}>{t("status.rented")}</span>
            </Link>
            <Link href="/vehicles?status=MAINTENANCE" className={styles.fleetStat} style={{ textDecoration: "none", color: "inherit" }}>
              <span className={styles.fleetDot} style={{ background: "var(--warning)" }} />
              <span className={styles.fleetCount}>{stats.maintenanceCount}</span>
              <span className={styles.fleetLabel}>{t("nav.maintenance")}</span>
            </Link>
          </div>
          {/* Progress bar */}
          <div className={styles.progressBar}>
            {stats.vehicleCount > 0 && (
              <>
                <div
                  className={styles.progressSeg}
                  style={{
                    width: `${(stats.availableCount / stats.vehicleCount) * 100}%`,
                    background: "var(--success)",
                    borderRadius: "4px 0 0 4px",
                  }}
                />
                <div
                  className={styles.progressSeg}
                  style={{
                    width: `${(stats.rentedCount / stats.vehicleCount) * 100}%`,
                    background: "var(--accent)",
                  }}
                />
                <div
                  className={styles.progressSeg}
                  style={{
                    width: `${(stats.maintenanceCount / stats.vehicleCount) * 100}%`,
                    background: "var(--warning)",
                    borderRadius: "0 4px 4px 0",
                  }}
                />
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Today + Recent */}
      <div className={styles.twoCol}>
        {/* Today's Activity */}
        <Card padding="md">
          <div className={styles.sectionHeader}>
            <h3><Clock size={18} /> {t("dashboard.todayTomorrow")}</h3>
          </div>

          {todayPickups.length === 0 && todayReturns.length === 0 && todayMaintenanceIn.length === 0 && todayMaintenanceOut.length === 0 ? (
            <div className={styles.emptyMini}>
              <p>{t("dashboard.noActivity")}</p>
            </div>
          ) : (
            <div className={styles.activityList}>
              {todayPickups.map((b) => (
                <div key={b.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: "var(--success)" }} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>
                      {t("dashboard.pickup")}: {b.vehicle.brand} {b.vehicle.model}
                    </span>
                    <span className={styles.activitySub}>
                      {getFullName(b.customer.firstName, b.customer.lastName)}
                    </span>
                  </div>
                  <Badge variant="success" size="sm">{getDayLabel(b.startDate)}</Badge>
                </div>
              ))}
              {todayReturns.map((b) => (
                <div key={b.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: "var(--info)" }} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>
                      {t("dashboard.return")}: {b.vehicle.brand} {b.vehicle.model}
                    </span>
                    <span className={styles.activitySub}>
                      {getFullName(b.customer.firstName, b.customer.lastName)}
                    </span>
                  </div>
                  <Badge variant="info" size="sm">{getDayLabel(b.endDate)}</Badge>
                </div>
              ))}
              {todayMaintenanceIn.map((m) => (
                <div key={m.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: "var(--warning)" }} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>
                      {t("dashboard.toShop")}: {m.vehicle.brand} {m.vehicle.model}
                    </span>
                    <span className={styles.activitySub}>
                      {translateMaintenanceText(m.description, t)}
                    </span>
                  </div>
                  <Badge variant="warning" size="sm">{getDayLabel(m.serviceDate)}</Badge>
                </div>
              ))}
              {todayMaintenanceOut.map((m) => (
                <div key={m.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: "var(--success)" }} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>
                      {t("dashboard.fromShop")}: {m.vehicle.brand} {m.vehicle.model}
                    </span>
                    <span className={styles.activitySub}>
                      {translateMaintenanceText(m.description, t)}
                    </span>
                  </div>
                  <Badge variant="success" size="sm">{getDayLabel(m.returnDate)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Bookings */}
        <Card padding="md">
          <div className={styles.sectionHeader}>
            <h3><TrendingUp size={18} /> {t("dashboard.recentBookings")}</h3>
            <Link href="/bookings" className={styles.viewAll}>
              {t("action.viewAll")} <ArrowRight size={14} />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className={styles.emptyMini}>
              <p>{t("dashboard.noBookingsYet")}</p>
            </div>
          ) : (
            <div className={styles.bookingList}>
              {recentBookings.map((b) => (
                <Link
                  href={`/bookings/${b.id}`}
                  key={b.id}
                  className={styles.bookingItem}
                >
                  <div className={styles.bookingInfo}>
                    <span className={styles.bookingTitle}>
                      {b.vehicle.brand} {b.vehicle.model}
                    </span>
                    <span className={styles.bookingSub}>
                      {getFullName(b.customer.firstName, b.customer.lastName)} · {formatDate(b.startDate)}
                    </span>
                  </div>
                  <div className={styles.bookingRight}>
                    <span className={styles.bookingAmount}>{formatCurrency(b.totalAmount)}</span>
                    <Badge
                      color={getStatusColor(b.status)}
                      bg={getStatusBg(b.status)}
                      size="sm"
                    >
                      {formatStatusT(b.status)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
