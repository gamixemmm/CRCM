"use client";
import { useSettings } from "@/lib/SettingsContext";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatDate, getFullName } from "@/lib/utils";

export default function PrintableInvoice({ invoice }: { invoice: any }) {
  const { formatPrice: formatCurrency } = useSettings();

  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const start = new Date(invoice.booking.startDate);
  const end = new Date(invoice.booking.endDate);
  const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      {/* Non-Printable Controls */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
          Back to Dashboard
        </Button>
        <Button variant="primary" icon={<Printer size={16} />} onClick={handlePrint}>
          Print Invoice
        </Button>
      </div>

      {/* Printable Area - Light Theme Overridden Context */}
      <div 
        ref={printRef}
        className="printable-document" 
        style={{ 
          background: "white", 
          color: "black", 
          padding: "60px",
          minHeight: "1000px",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          fontFamily: "var(--font-sans)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #eee", paddingBottom: "24px", marginBottom: "40px" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: "#111" }}>INVOICE</h1>
            <p style={{ color: "#666", marginTop: "4px" }}>No. {invoice.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>AutoRide Car Rentals</h2>
            <p style={{ color: "#666", margin: "4px 0", fontSize: "0.875rem" }}>123 Ocean Blvd, CA 90210</p>
            <p style={{ color: "#666", margin: "0", fontSize: "0.875rem" }}>billing@autoride.com</p>
            <p style={{ color: "#666", margin: "0", fontSize: "0.875rem" }}>+1 (555) 123-4567</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "40px" }}>
          <div>
            <h3 style={{ fontSize: "0.875rem", textTransform: "uppercase", color: "#666", letterSpacing: "1px", marginBottom: "8px" }}>Billed To:</h3>
            <p style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "1.125rem" }}>{getFullName(invoice.booking.customer.firstName, invoice.booking.customer.lastName)}</p>
            <p style={{ margin: "0", color: "#444", fontSize: "0.875rem" }}>{invoice.booking.customer.address || "Address not provided"}</p>
            <p style={{ margin: "4px 0 0 0", color: "#444", fontSize: "0.875rem" }}>{invoice.booking.customer.phone}</p>
          </div>
          <div style={{ textAlign: "right", alignSelf: "flex-end" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "24px", marginBottom: "8px", fontSize: "0.875rem" }}>
              <span style={{ color: "#666" }}>Date Issued:</span>
              <span style={{ fontWeight: 600 }}>{formatDate(invoice.createdAt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "24px", fontSize: "0.875rem" }}>
              <span style={{ color: "#666" }}>Status:</span>
              <span style={{ 
                fontWeight: 700, 
                color: invoice.paymentStatus === "PAID" ? "#00c853" : invoice.paymentStatus === "PARTIAL" ? "#00b0ff" : "#ff3d71" 
              }}>
                {invoice.paymentStatus === "PARTIAL" ? "PARTIALLY PAID" : invoice.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px" }}>
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", textTransform: "uppercase", color: "#666", borderTop: "1px solid #dee2e6", borderBottom: "2px solid #dee2e6" }}>Description</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", textTransform: "uppercase", color: "#666", borderTop: "1px solid #dee2e6", borderBottom: "2px solid #dee2e6" }}>Rate / Qty</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", textTransform: "uppercase", color: "#666", borderTop: "1px solid #dee2e6", borderBottom: "2px solid #dee2e6" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "16px", borderBottom: "1px solid #eee" }}>
                <div style={{ fontWeight: 600, color: "#111" }}>{invoice.booking.vehicle.brand} {invoice.booking.vehicle.model}</div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>Rental Period: {formatDate(invoice.booking.startDate)} — {formatDate(invoice.booking.endDate)}</div>
              </td>
              <td style={{ padding: "16px", textAlign: "right", borderBottom: "1px solid #eee", color: "#444" }}>
                {formatCurrency(invoice.booking.vehicle.dailyRate)} x {days} Days
              </td>
              <td style={{ padding: "16px", textAlign: "right", borderBottom: "1px solid #eee", fontWeight: 600, color: "#111" }}>
                {formatCurrency(invoice.subtotal)}
              </td>
            </tr>
            {invoice.extraCharges > 0 && (
              <tr>
                <td style={{ padding: "16px", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontWeight: 600, color: "#111" }}>Extra Charges</div>
                  <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>{invoice.extraChargeDesc || "Additional fees applied"}</div>
                </td>
                <td style={{ padding: "16px", textAlign: "right", borderBottom: "1px solid #eee", color: "#444" }}>—</td>
                <td style={{ padding: "16px", textAlign: "right", borderBottom: "1px solid #eee", fontWeight: 600, color: "#111" }}>
                  {formatCurrency(invoice.extraCharges)}
                </td>
              </tr>
            )}
            {invoice.discount > 0 && (
              <tr>
                <td style={{ padding: "16px", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontWeight: 600, color: "#111" }}>Discount Applied</div>
                </td>
                <td style={{ padding: "16px", textAlign: "right", borderBottom: "1px solid #eee", color: "#444" }}>—</td>
                <td style={{ padding: "16px", textAlign: "right", borderBottom: "1px solid #eee", fontWeight: 600, color: "#00c853" }}>
                  -{formatCurrency(invoice.discount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "0.875rem", color: "#444" }}>
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            {invoice.depositPaid > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "0.875rem", color: "#444" }}>
                <span>Deposit Paid</span>
                <span>-{formatCurrency(invoice.depositPaid)}</span>
              </div>
            )}
            {(() => {
              const prevPaid = invoice.totalAmount - invoice.depositPaid - invoice.amountDue;
              if (prevPaid > 0 && invoice.paymentStatus !== "PENDING") {
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "0.875rem", color: "#444" }}>
                    <span>Payments Made</span>
                    <span style={{ color: "#00c853" }}>-{formatCurrency(prevPaid)}</span>
                  </div>
                );
              }
              return null;
            })()}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: "2px solid #111", marginTop: "8px", fontWeight: 800, fontSize: "1.25rem", color: "#111" }}>
              <span>Amount Due</span>
              <span>{formatCurrency(invoice.amountDue)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid #eee", color: "#666", fontSize: "0.75rem", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>Thank you for your business!</p>
          <p style={{ margin: 0 }}>Payment is required within 14 days of invoice generation. Late fees may apply.</p>
        </div>
      </div>
    </div>
  );
}
