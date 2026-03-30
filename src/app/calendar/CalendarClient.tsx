"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Car, Wrench, Filter } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getCalendarEvents } from "@/actions/calendar";
import { formatDate } from "@/lib/utils";

export default function CalendarClient() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, BOOKING, MAINTENANCE

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const data = await getCalendarEvents(year, month);
      setEvents(data);
      setLoading(false);
    }
    fetchEvents();
  }, [year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Build grid
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // Empty slots before 1st day
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Helper to check if event sits on a mapped grid day
  const getEventsForDay = (dayNum: number) => {
    if (!dayNum) return [];
    
    // Day in current iteration
    const cellDate = new Date(year, month, dayNum);
    cellDate.setHours(0, 0, 0, 0);

    return events.filter(e => {
      if (filter !== "ALL" && e.type !== filter) return false;
      const start = new Date(e.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(e.endDate);
      end.setHours(23, 59, 59, 999);
      return cellDate >= start && cellDate <= end;
    });
  };

  const today = new Date();
  const isToday = (dayNum: number) => 
    dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="animate-fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h1>
          <CalendarDays size={24} />
          Master Calendar
        </h1>
        <div className="page-header-actions">
          <div style={{ display: "flex", gap: "8px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "8px" }}>
            <button 
              onClick={() => setFilter("ALL")}
              style={{ padding: "6px 12px", background: filter === "ALL" ? "var(--bg-elevated)" : "transparent", color: filter === "ALL" ? "var(--text-primary)" : "var(--text-secondary)", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
            >
              All Events
            </button>
            <button 
              onClick={() => setFilter("BOOKING")}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: filter === "BOOKING" ? "var(--accent-muted)" : "transparent", color: filter === "BOOKING" ? "var(--accent)" : "var(--text-secondary)", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
            >
              <Car size={14} /> Rentals
            </button>
            <button 
              onClick={() => setFilter("MAINTENANCE")}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: filter === "MAINTENANCE" ? "var(--warning-muted)" : "transparent", color: filter === "MAINTENANCE" ? "var(--warning)" : "var(--text-secondary)", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
            >
              <Wrench size={14} /> Shop
            </button>
          </div>
        </div>
      </div>

      <Card padding="md" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "0" }}>
        
        {/* Calendar Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>
            {monthNames[month]} {year}
          </h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={prevMonth} />
            <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="secondary" icon={<ChevronRight size={16} />} onClick={nextMonth} />
          </div>
        </div>

        {/* Days Header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "8px" }}>
          {dayNames.map(d => (
            <div key={d} style={{ textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid Area */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
            Loading schedule...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(120px, 1fr)", gap: "8px", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
            {days.map((d, index) => {
              const cellEvents = d ? getEventsForDay(d) : [];
              return (
                <div 
                  key={index} 
                  style={{ 
                    background: "var(--bg-tertiary)", 
                    borderRadius: "8px", 
                    padding: "8px", 
                    opacity: d ? 1 : 0.4,
                    border: d && isToday(d) ? "1px solid var(--accent)" : "1px solid transparent",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "8px", color: d && isToday(d) ? "var(--accent)" : "var(--text-primary)" }}>
                    {d || ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, overflowY: "auto", paddingRight: "2px" }}>
                    {cellEvents.map(ev => {
                      const start = new Date(ev.startDate);
                      const end = new Date(ev.endDate);
                      
                      const isStart = d === start.getDate() && month === start.getMonth() && year === start.getFullYear();
                      const isEnd = d === end.getDate() && month === end.getMonth() && year === end.getFullYear();

                      let displayLabel = ev.title;
                      if (isStart && isEnd) {
                        displayLabel = ev.type === "BOOKING" ? `Same-Day: ${ev.title}` : `Quick Fix: ${ev.title}`;
                      } else if (isStart) {
                        displayLabel = ev.type === "BOOKING" ? `Pickup: ${ev.title}` : `To Shop: ${ev.title}`;
                      } else if (isEnd) {
                        displayLabel = ev.type === "BOOKING" ? `Return: ${ev.title}` : `Out of Shop: ${ev.title}`;
                      } else {
                        displayLabel = ev.type === "BOOKING" ? `Rented: ${ev.title}` : `In Shop: ${ev.title}`;
                      }

                      return (
                        <div 
                          key={ev.id} 
                          onClick={() => router.push(ev.type === "BOOKING" ? `/bookings/${ev.originalId}` : `/maintenance`)}
                          style={{ 
                            background: ev.bg, 
                            color: ev.color, 
                            padding: "4px 6px", 
                            borderRadius: "4px", 
                            fontSize: "0.75rem", 
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            border: `1px solid ${ev.color}33`,
                            display: "flex",
                            flexDirection: "column"
                          }}
                          title={`${ev.title} - ${ev.subtitle}`}
                        >
                          <span style={{ fontWeight: 700 }}>{displayLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
