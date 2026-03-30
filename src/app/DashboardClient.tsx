"use client";

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
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate, formatStatus, getStatusColor, getStatusBg, getFullName } from "@/lib/utils";
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
    monthlyRevenue: number;
  };
  recentBookings: BookingRow[];
  todayPickups: BookingRow[];
  todayReturns: BookingRow[];
  todayMaintenanceIn: any[];
  todayMaintenanceOut: any[];
}

export default function DashboardClient({
  stats,
  recentBookings,
  todayPickups,
  todayReturns,
  todayMaintenanceIn,
  todayMaintenanceOut,
}: DashboardClientProps) {
  const statCards = [
    {
      label: "Total Vehicles",
      value: stats.vehicleCount,
      icon: <Car size={22} />,
      color: "var(--accent)",
      bg: "var(--accent-muted)",
      href: "/vehicles",
    },
    {
      label: "Active Bookings",
      value: stats.activeBookings,
      icon: <CalendarDays size={22} />,
      color: "var(--success)",
      bg: "var(--success-muted)",
      href: "/bookings",
    },
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      icon: <Users size={22} />,
      color: "var(--info)",
      bg: "var(--info-muted)",
      href: "/customers",
    },
    {
      label: "Monthly Revenue",
      value: formatCurrency(stats.monthlyRevenue),
      icon: <DollarSign size={22} />,
      color: "var(--warning)",
      bg: "var(--warning-muted)",
      href: "/invoices",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <div className={styles.welcome}>
        <div>
          <h1 className={styles.welcomeTitle}>Welcome back 👋</h1>
          <p className={styles.welcomeSub}>
            Here&apos;s what&apos;s happening with your fleet today.
          </p>
        </div>
        <div className={styles.quickActions}>
          <Link href="/bookings/new">
            <Button icon={<Plus size={16} />}>New Booking</Button>
          </Link>
          <Link href="/vehicles/new">
            <Button variant="secondary" icon={<Plus size={16} />}>Add Vehicle</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <Link href={s.href} key={s.label} style={{ textDecoration: "none" }}>
            <Card hover padding="md">
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
            <h3>Fleet Status</h3>
            <Link href="/vehicles" className={styles.viewAll}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className={styles.fleetStats}>
            <div className={styles.fleetStat}>
              <span className={styles.fleetDot} style={{ background: "var(--success)" }} />
              <span className={styles.fleetCount}>{stats.availableCount}</span>
              <span className={styles.fleetLabel}>Available</span>
            </div>
            <div className={styles.fleetStat}>
              <span className={styles.fleetDot} style={{ background: "var(--accent)" }} />
              <span className={styles.fleetCount}>{stats.rentedCount}</span>
              <span className={styles.fleetLabel}>Rented</span>
            </div>
            <div className={styles.fleetStat}>
              <span className={styles.fleetDot} style={{ background: "var(--warning)" }} />
              <span className={styles.fleetCount}>{stats.maintenanceCount}</span>
              <span className={styles.fleetLabel}>Maintenance</span>
            </div>
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
            <h3><Clock size={18} /> Today&apos;s Activity</h3>
          </div>

          {todayPickups.length === 0 && todayReturns.length === 0 && todayMaintenanceIn.length === 0 && todayMaintenanceOut.length === 0 ? (
            <div className={styles.emptyMini}>
              <p>No pickups, returns, or shop repairs scheduled for today</p>
            </div>
          ) : (
            <div className={styles.activityList}>
              {todayPickups.map((b) => (
                <div key={b.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: "var(--success)" }} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>
                      Pickup: {b.vehicle.brand} {b.vehicle.model}
                    </span>
                    <span className={styles.activitySub}>
                      {getFullName(b.customer.firstName, b.customer.lastName)}
                    </span>
                  </div>
                  <Badge variant="success" size="sm">Pickup</Badge>
                </div>
              ))}
              {todayReturns.map((b) => (
                <div key={b.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: "var(--info)" }} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>
                      Return: {b.vehicle.brand} {b.vehicle.model}
                    </span>
                    <span className={styles.activitySub}>
                      {getFullName(b.customer.firstName, b.customer.lastName)}
                    </span>
                  </div>
                  <Badge variant="info" size="sm">Return</Badge>
                </div>
              ))}
              {todayMaintenanceIn.map((m) => (
                <div key={m.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: "var(--warning)" }} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>
                      To Shop: {m.vehicle.brand} {m.vehicle.model}
                    </span>
                    <span className={styles.activitySub}>
                      {m.description}
                    </span>
                  </div>
                  <Badge variant="warning" size="sm">Shop In</Badge>
                </div>
              ))}
              {todayMaintenanceOut.map((m) => (
                <div key={m.id} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: "var(--success)" }} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>
                      From Shop: {m.vehicle.brand} {m.vehicle.model}
                    </span>
                    <span className={styles.activitySub}>
                      {m.description}
                    </span>
                  </div>
                  <Badge variant="success" size="sm">Shop Out</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Bookings */}
        <Card padding="md">
          <div className={styles.sectionHeader}>
            <h3><TrendingUp size={18} /> Recent Bookings</h3>
            <Link href="/bookings" className={styles.viewAll}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className={styles.emptyMini}>
              <p>No bookings yet</p>
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
                      {formatStatus(b.status)}
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
