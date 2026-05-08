"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Car, ChevronLeft, ChevronRight, Gauge, TrendingUp, Wrench } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { getVehicleMonthlyStats } from "@/actions/calendar";
import { useSettings } from "@/lib/SettingsContext";

type SummaryRange = "LAST_30_DAYS" | "LAST_90_DAYS" | "LAST_YEAR" | "ALL_TIME";

type MonthlyStats = {
  month: number;
  label: string;
  bookedDays: number;
  stoppedDays: number;
  availableDays: number;
  bookingCount: number;
  revenue: number;
};

type VehicleStats = {
  id: string;
  label: string;
  plateNumber: string;
  status: string;
  monthly: MonthlyStats[];
  totals: {
    bookedDays: number;
    stoppedDays: number;
    availableDays: number;
    bookingCount: number;
    revenue: number;
  };
  summaryTotals: {
    bookedDays: number;
    stoppedDays: number;
    bookingCount: number;
    revenue: number;
  };
};

type StatsPayload = {
  year: number;
  months: { month: number; label: string }[];
  summaryRange: SummaryRange;
  vehicles: VehicleStats[];
};

const summaryRanges: SummaryRange[] = ["LAST_30_DAYS", "LAST_90_DAYS", "LAST_YEAR", "ALL_TIME"];

export default function CalendarClient() {
  const { formatPrice, t } = useSettings();
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState("ALL");
  const [summaryRange, setSummaryRange] = useState<SummaryRange>("LAST_30_DAYS");

  useEffect(() => {
    let active = true;
    async function loadStats() {
      setLoading(true);
      const result = await getVehicleMonthlyStats(year, summaryRange);
      if (!active) return;
      setData(result);
      setLoading(false);
    }
    loadStats();
    return () => {
      active = false;
    };
  }, [year, summaryRange]);

  const selectedVehicle = useMemo(() => {
    if (!data || selectedVehicleId === "ALL") return null;
    return data.vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null;
  }, [data, selectedVehicleId]);

  const chartData = useMemo(() => {
    if (!data) return [];

    if (selectedVehicle) {
      return selectedVehicle.monthly.map((month) => ({
        month: month.label,
        revenue: month.revenue,
        bookedDays: month.bookedDays,
        stoppedDays: month.stoppedDays,
        bookings: month.bookingCount,
      }));
    }

    return data.months.map((month) => {
      const monthlyRows = data.vehicles.map((vehicle) => vehicle.monthly[month.month]);
      return {
        month: month.label,
        revenue: monthlyRows.reduce((sum, row) => sum + row.revenue, 0),
        bookedDays: monthlyRows.reduce((sum, row) => sum + row.bookedDays, 0),
        stoppedDays: monthlyRows.reduce((sum, row) => sum + row.stoppedDays, 0),
        bookings: monthlyRows.reduce((sum, row) => sum + row.bookingCount, 0),
      };
    });
  }, [data, selectedVehicle]);

  const totals = useMemo(() => {
    if (!data) return { revenue: 0, bookedDays: 0, stoppedDays: 0, bookingCount: 0 };
    const vehicles = selectedVehicle ? [selectedVehicle] : data.vehicles;
    return vehicles.reduce(
      (acc, vehicle) => ({
        revenue: acc.revenue + vehicle.totals.revenue,
        bookedDays: acc.bookedDays + vehicle.totals.bookedDays,
        stoppedDays: acc.stoppedDays + vehicle.totals.stoppedDays,
        bookingCount: acc.bookingCount + vehicle.totals.bookingCount,
      }),
      { revenue: 0, bookedDays: 0, stoppedDays: 0, bookingCount: 0 }
    );
  }, [data, selectedVehicle]);

  const vehicleRows = useMemo(() => {
    if (!data) return [];
    return [...data.vehicles].sort((a, b) => b.summaryTotals.revenue - a.summaryTotals.revenue);
  }, [data]);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="page-header">
        <h1>
          <BarChart3 size={24} />
          {t("statistics.vehiclePerformance")}
        </h1>
        <div className="page-header-actions">
          <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => setYear((value) => value - 1)} />
          <div style={{ minWidth: "86px", textAlign: "center", fontWeight: 800, fontSize: "1.125rem" }}>{year}</div>
          <Button variant="secondary" icon={<ChevronRight size={16} />} onClick={() => setYear((value) => value + 1)} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
        <Card padding="md">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--success)", marginBottom: "8px" }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t("statistics.revenue")}</span>
          </div>
          <strong style={{ fontSize: "1.5rem" }}>{formatPrice(totals.revenue)}</strong>
        </Card>
        <Card padding="md">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--accent)", marginBottom: "8px" }}>
            <Car size={18} />
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t("statistics.movedBookedDays")}</span>
          </div>
          <strong style={{ fontSize: "1.5rem" }}>{totals.bookedDays}</strong>
        </Card>
        <Card padding="md">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--warning)", marginBottom: "8px" }}>
            <Wrench size={18} />
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t("statistics.stoppedDays")}</span>
          </div>
          <strong style={{ fontSize: "1.5rem" }}>{totals.stoppedDays}</strong>
        </Card>
        <Card padding="md">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--info)", marginBottom: "8px" }}>
            <Gauge size={18} />
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t("statistics.bookings")}</span>
          </div>
          <strong style={{ fontSize: "1.5rem" }}>{totals.bookingCount}</strong>
        </Card>
      </div>

      <Card padding="lg">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap", marginBottom: "18px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
              {selectedVehicle ? `${selectedVehicle.label} - ${selectedVehicle.plateNumber}` : t("statistics.fleetMonthlyDiagram")}
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {t("statistics.diagramDesc")}
            </p>
          </div>
          <select
            value={selectedVehicleId}
            onChange={(event) => setSelectedVehicleId(event.target.value)}
            style={{
              minWidth: "260px",
              height: "40px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              padding: "0 12px",
            }}
          >
            <option value="ALL">{t("statistics.allVehicles")}</option>
            {data?.vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.label} - {vehicle.plateNumber}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: "100%", height: "380px" }}>
          {loading ? (
            <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--text-tertiary)" }}>{t("statistics.loading")}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis yAxisId="left" stroke="var(--text-secondary)" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                  }}
                  formatter={(value, name) => name === "revenue" ? formatPrice(Number(value)) : value}
                />
                <Legend />
                <Bar yAxisId="right" dataKey="revenue" name={t("statistics.revenue")} fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="bookedDays" name={t("statistics.movedDays")} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="stoppedDays" name={t("statistics.stoppedDays")} fill="var(--warning)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="bookings" name={t("statistics.bookings")} fill="var(--info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card padding="lg">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{t("statistics.eachCar")}</h2>
          <select
            value={summaryRange}
            onChange={(event) => setSummaryRange(event.target.value as SummaryRange)}
            style={{
              minWidth: "180px",
              height: "40px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              padding: "0 12px",
            }}
            aria-label={t("statistics.summaryRange")}
          >
            {summaryRanges.map((range) => (
              <option key={range} value={range}>
                {t(`statistics.range.${range}`)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ color: "var(--text-tertiary)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "12px" }}>{t("statistics.car")}</th>
                <th style={{ padding: "12px" }}>{t("statistics.status")}</th>
                <th style={{ padding: "12px", textAlign: "right" }}>{t("statistics.revenue")}</th>
                <th style={{ padding: "12px", textAlign: "right" }}>{t("statistics.movedDays")}</th>
                <th style={{ padding: "12px", textAlign: "right" }}>{t("statistics.stoppedDays")}</th>
                <th style={{ padding: "12px", textAlign: "right" }}>{t("statistics.bookings")}</th>
              </tr>
            </thead>
            <tbody>
              {vehicleRows.map((vehicle) => (
                <tr key={vehicle.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      style={{ border: "none", background: "transparent", color: "var(--text-primary)", padding: 0, cursor: "pointer", textAlign: "left" }}
                    >
                      <strong>{vehicle.label}</strong>
                      <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", marginTop: "2px" }}>{vehicle.plateNumber}</div>
                    </button>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <Badge variant={vehicle.status === "AVAILABLE" ? "success" : vehicle.status === "MAINTENANCE" ? "warning" : "default"}>
                      {vehicle.status}
                    </Badge>
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 700 }}>{formatPrice(vehicle.summaryTotals.revenue)}</td>
                  <td style={{ padding: "12px", textAlign: "right" }}>{vehicle.summaryTotals.bookedDays}</td>
                  <td style={{ padding: "12px", textAlign: "right" }}>{vehicle.summaryTotals.stoppedDays}</td>
                  <td style={{ padding: "12px", textAlign: "right" }}>{vehicle.summaryTotals.bookingCount}</td>
                </tr>
              ))}
              {!loading && vehicleRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "28px", textAlign: "center", color: "var(--text-tertiary)" }}>
                    {t("statistics.noVehicles")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
