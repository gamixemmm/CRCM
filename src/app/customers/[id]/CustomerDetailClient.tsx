"use client";
import { useSettings } from "@/lib/SettingsContext";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, FileText, CalendarDays } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatDate, getStatusColor, getStatusBg, getFullName } from "@/lib/utils";

export default function CustomerDetailClient({ customer }: { customer: any }) {
  const { formatPrice: formatCurrency, t, formatStatusT } = useSettings();

  const router = useRouter();

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>{getFullName(customer.firstName, customer.lastName)}</h1>
        <div style={{ display: "flex", gap: "12px" }}>
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
            {t("action.back")}
          </Button>
          <Button variant="secondary" icon={<Edit size={16} />}>
            {t("customers.editProfile")}
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        
        {/* Sidebar Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>{t("customers.profile")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block" }}>{t("customers.phone")}</span>
                <span style={{ fontWeight: 600 }}>{customer.phone || "—"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block" }}>{t("customers.email")}</span>
                <span style={{ fontWeight: 600 }}>{customer.email || "—"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block" }}>{t("customers.address")}</span>
                <span style={{ fontWeight: 600 }}>{customer.address || "—"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block" }}>{t("customers.joined")}</span>
                <span style={{ fontWeight: 600 }}>{formatDate(customer.createdAt)}</span>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={16} /> {t("customers.identity")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block" }}>{t("customers.licenseCin")}</span>
                <span style={{ fontWeight: 600 }}>{customer.licenseNumber || "—"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block" }}>{t("customers.licenseExpiry")}</span>
                <span style={{ fontWeight: 600 }}>{customer.licenseExpiry ? formatDate(customer.licenseExpiry) : "—"}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content (Bookings) */}
        <div>
          <Card padding="lg" style={{ minHeight: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}><CalendarDays size={16} /> {t("customers.bookingHistory")}</h3>
              <Link href="/bookings/new">
                <Button size="sm" variant="ghost">{t("bookings.newBooking")}</Button>
              </Link>
            </div>

            {customer.bookings.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-tertiary)" }}>
                {t("customers.noBookings")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {customer.bookings.map((b: any) => (
                  <Link href={`/bookings/${b.id}`} key={b.id} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)", transition: "all 0.2s" }} className="hover-lift">
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {b.vehicle.brand} {b.vehicle.model}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {formatDate(b.startDate)} → {formatDate(b.endDate)}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(b.totalAmount)}</span>
                        <Badge color={getStatusColor(b.status)} bg={getStatusBg(b.status)} size="sm">
                          {formatStatusT(b.status)}
                        </Badge>
                      </div>

                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
