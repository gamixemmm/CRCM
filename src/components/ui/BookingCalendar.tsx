"use client";

import { useState, useMemo } from "react";
import { useSettings } from "@/lib/SettingsContext";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BookedRange {
  startDate: string | Date;
  endDate: string | Date;
  status: string;
}

interface BookingCalendarProps {
  bookedRanges: BookedRange[];
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  mode?: "range" | "single";
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function BookingCalendar({
  bookedRanges,
  startDate,
  endDate,
  onDateChange,
  mode = "range",
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const { t } = useSettings();

  const today = startOfDay(new Date());

  // Parse booked ranges into date intervals
  const bookedIntervals = useMemo(() => {
    return bookedRanges
      .filter((r) => r.status === "CONFIRMED" || r.status === "ACTIVE")
      .map((r) => ({
        start: startOfDay(new Date(r.startDate)),
        end: startOfDay(new Date(r.endDate)),
      }));
  }, [bookedRanges]);

  const isDateBooked = (date: Date): boolean => {
    const d = startOfDay(date);
    return bookedIntervals.some(
      (interval) =>
        (isSameDay(d, interval.start) || isAfter(d, interval.start)) &&
        (isSameDay(d, interval.end) || isBefore(d, interval.end))
    );
  };

  const isDatePast = (date: Date): boolean => {
    return isBefore(startOfDay(date), today);
  };

  // Check if a range between two dates crosses any booked interval
  const rangeHasConflict = (from: Date, to: Date): boolean => {
    const s = startOfDay(from);
    const e = startOfDay(to);
    return bookedIntervals.some((interval) => {
      return (
        (isBefore(s, interval.end) || isSameDay(s, interval.end)) &&
        (isAfter(e, interval.start) || isSameDay(e, interval.start))
      );
    });
  };

  const selectedStart = startDate ? startOfDay(new Date(startDate)) : null;
  const selectedEnd = endDate ? startOfDay(new Date(endDate)) : null;

  const handleDayClick = (date: Date) => {
    const d = startOfDay(date);
    if (isDatePast(d) || isDateBooked(d)) return;

    if (mode === "single") {
      const formatted = format(d, "yyyy-MM-dd");
      onDateChange(formatted, formatted);
      return;
    }

    if (selecting === "start") {
      const formatted = format(d, "yyyy-MM-dd");
      onDateChange(formatted, "");
      setSelecting("end");
    } else {
      // selecting end
      if (selectedStart && (isAfter(d, selectedStart) || isSameDay(d, selectedStart))) {
        if (rangeHasConflict(selectedStart, d)) {
          // Can't span across booked dates — restart
          const formatted = format(d, "yyyy-MM-dd");
          onDateChange(formatted, "");
          setSelecting("end");
          return;
        }
        const formatted = format(d, "yyyy-MM-dd");
        onDateChange(startDate, formatted);
        setSelecting("start");
      } else {
        // Clicked before start — reset start
        const formatted = format(d, "yyyy-MM-dd");
        onDateChange(formatted, "");
        setSelecting("end");
      }
    }
  };

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const getDayStyle = (date: Date): React.CSSProperties => {
    const d = startOfDay(date);
    const booked = isDateBooked(d);
    const past = isDatePast(d);
    const inMonth = isSameMonth(d, currentMonth);
    const isToday = isSameDay(d, today);
    const isStart = selectedStart && isSameDay(d, selectedStart);
    const isEnd = selectedEnd && isSameDay(d, selectedEnd);
    const inRange =
      selectedStart &&
      selectedEnd &&
      isWithinInterval(d, { start: selectedStart, end: selectedEnd });

    const base: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "40px",
      borderRadius: "10px",
      fontSize: "0.8125rem",
      fontWeight: 500,
      cursor: "default",
      transition: "all 0.15s ease",
      position: "relative",
      border: "2px solid transparent",
    };

    if (!inMonth) {
      return { ...base, color: "var(--text-tertiary)", opacity: 0.3 };
    }

    if (booked) {
      return {
        ...base,
        background: "var(--danger-muted)",
        color: "var(--danger)",
        cursor: "not-allowed",
        fontWeight: 600,
      };
    }

    if (past) {
      return {
        ...base,
        color: "var(--text-tertiary)",
        opacity: 0.4,
        cursor: "not-allowed",
      };
    }

    if (isStart || isEnd) {
      return {
        ...base,
        background: "var(--accent)",
        color: "#fff",
        fontWeight: 700,
        cursor: "pointer",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
      };
    }

    if (inRange) {
      return {
        ...base,
        background: "var(--accent-muted)",
        color: "var(--accent)",
        fontWeight: 600,
        cursor: "pointer",
        borderRadius: "6px",
      };
    }

    if (isToday) {
      return {
        ...base,
        border: "2px solid var(--accent)",
        color: "var(--accent)",
        fontWeight: 600,
        cursor: "pointer",
      };
    }

    return {
      ...base,
      color: "var(--text-primary)",
      cursor: "pointer",
    };
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <span
          style={{
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--text-primary)",
          }}
        >
          {format(currentMonth, "MMMM yyyy")}
        </span>

        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "8px",
        }}
      >
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            style={{
              textAlign: "center",
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              padding: "4px 0",
            }}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}
      >
        {calendarDays.map((d, idx) => {
          const inMonth = isSameMonth(d, currentMonth);
          const booked = isDateBooked(d);
          const past = isDatePast(d);
          const clickable = inMonth && !booked && !past;

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                onClick={clickable ? () => handleDayClick(d) : undefined}
                onMouseEnter={(e) => {
                  if (clickable) {
                    (e.currentTarget as HTMLDivElement).style.transform = "scale(1.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                }}
                style={getDayStyle(d)}
              >
                {format(d, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid var(--border)",
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "var(--accent)",
            }}
          />
          {t("calendar.selected")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "var(--accent-muted)",
            }}
          />
          {t("calendar.range")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "var(--danger-muted)",
              border: "1px solid var(--danger)",
            }}
          />
          {t("calendar.booked")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "var(--bg-tertiary)",
              opacity: 0.4,
            }}
          />
          {t("calendar.past")}
        </div>
      </div>

      {/* Selection status */}
      <div
        style={{
          marginTop: "12px",
          padding: "10px 14px",
          background: "var(--bg-tertiary)",
          borderRadius: "8px",
          fontSize: "0.8125rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          {mode === "single" ? (
            <span>
              <span style={{ color: "var(--text-tertiary)" }}>{t("calendar.selectedDate")} </span>
              <span style={{ fontWeight: 600, color: selectedStart ? "var(--accent)" : "var(--text-tertiary)" }}>
                {selectedStart ? format(selectedStart, "dd MMM yyyy") : t("calendar.clickToSelect")}
              </span>
            </span>
          ) : (
            <>
              <span>
                <span style={{ color: "var(--text-tertiary)" }}>{t("calendar.delivery")} </span>
                <span style={{ fontWeight: 600, color: selectedStart ? "var(--accent)" : "var(--text-tertiary)" }}>
                  {selectedStart ? format(selectedStart, "dd MMM yyyy") : t("calendar.clickDate")}
                </span>
              </span>
              <span>
                <span style={{ color: "var(--text-tertiary)" }}>{t("calendar.return")} </span>
                <span style={{ fontWeight: 600, color: selectedEnd ? "var(--accent)" : "var(--text-tertiary)" }}>
                  {selectedEnd ? format(selectedEnd, "dd MMM yyyy") : selecting === "end" ? t("calendar.clickEndDate") : "—"}
                </span>
              </span>
            </>
          )}
        </div>
        {(selectedStart || selectedEnd) && (
          <button
            type="button"
            onClick={() => {
              onDateChange("", "");
              setSelecting("start");
            }}
            style={{
              fontSize: "0.75rem",
              color: "var(--danger)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {t("calendar.clear")}
          </button>
        )}
      </div>
    </div>
  );
}
