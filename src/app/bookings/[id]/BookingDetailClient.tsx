"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Car, FileText, CheckCircle, XCircle, Trash2, Building2, CreditCard } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input, { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createInvoice, updatePaymentStatus, deleteInvoice } from "@/actions/invoices";
import { formatDate, formatCurrency, formatStatus, getStatusColor, getStatusBg, getFullName } from "@/lib/utils";

export default function BookingDetailClient({ booking }: { booking: any }) {
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

  // Duration
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const baseSubtotal = days * booking.vehicle.dailyRate;

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
    if (!booking.invoice || !confirm("Revert this invoice to PENDING?")) return;
    setGenerating(true);
    const res = await updatePaymentStatus(booking.invoice.id, "PENDING", false);
    setGenerating(false);
    if (res.success) {
      toast("Invoice reverted to PENDING", "success");
    } else {
      toast(res.message, "error");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!booking.invoice || !confirm("Permanently delete this invoice?")) return;
    setGenerating(true);
    const res = await deleteInvoice(booking.invoice.id);
    setGenerating(false);
    if (res.success) {
      toast("Invoice deleted", "success");
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h1>Booking Details</h1>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>ID: {booking.id}</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Badge color={getStatusColor(booking.status)} bg={getStatusBg(booking.status)} dot>
            {formatStatus(booking.status)}
          </Badge>
          <Badge 
            color={booking.clientType === "ENTREPRISE" ? "var(--warning)" : "var(--info)"}
            bg={booking.clientType === "ENTREPRISE" ? "var(--warning-muted)" : "var(--info-muted)"}
          >
            {booking.clientType === "ENTREPRISE" ? "Company" : "Individual"}
          </Badge>
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        
        {/* Left Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <Card padding="lg" hover onClick={() => router.push(`/customers/${booking.customerId}`)}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                <User size={16} /> Broker
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
                  License: {booking.customer.licenseNumber}
                </div>
              )}
            </Card>

            <Card padding="lg" hover onClick={() => router.push(`/vehicles/${booking.vehicleId}`)}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                <Car size={16} /> Vehicle
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
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Rental Timeline & Logistics</h3>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tertiary)", padding: "16px", borderRadius: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Pickup</span>
                <span style={{ fontWeight: 600, fontSize: "1.125rem" }}>{formatDate(booking.startDate)}</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{booking.pickupLocation || "Main Office"}</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-tertiary)" }}>
                <div style={{ padding: "4px 12px", background: "var(--bg-secondary)", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 }}>
                  {days} Days
                </div>
                <div style={{ width: "100px", height: "1px", background: "var(--border)", margin: "8px 0" }}></div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Return</span>
                <span style={{ fontWeight: 600, fontSize: "1.125rem" }}>{formatDate(booking.endDate)}</span>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{booking.returnLocation || "Main Office"}</span>
              </div>
            </div>

            {booking.notes && (
              <div style={{ marginTop: "24px" }}>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Notes:</h4>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{booking.notes}</p>
              </div>
            )}
          </Card>

          {/* Company & Driver Info */}
          {booking.clientType === "ENTREPRISE" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <Card padding="lg">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <Building2 size={16} /> Company Info
                </h3>
                <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Company</span>
                    <span style={{ fontWeight: 600 }}>{booking.companyName}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>ICE</span>
                    <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{booking.companyICE}</span>
                  </div>
                </div>
              </Card>
              <Card padding="lg">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <User size={16} /> Driver
                </h3>
                <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Name</span>
                    <span style={{ fontWeight: 600 }}>{booking.driverFirstName} {booking.driverLastName}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>CIN</span>
                    <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{booking.driverCIN}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </div>

        {/* Right Col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <Card padding="lg">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <FileText size={16} /> Financials
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Daily Rate ({days} days)</span>
                <span>{formatCurrency(booking.vehicle.dailyRate)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Deposit</span>
                <span>{formatCurrency(booking.depositAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border)", fontWeight: 700, fontSize: "1.125rem", color: "var(--accent)" }}>
                <span>Total Amount</span>
                <span>{formatCurrency(booking.totalAmount)}</span>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed var(--border)" }}>
              {booking.invoice ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--success)" }}>
                      <CheckCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }}/> 
                      Invoiced ({booking.invoice.paymentStatus})
                    </span>
                    <Link href={`/invoices/${booking.invoice.id}`}>
                      <Button size="sm" variant="secondary">View Invoice</Button>
                    </Link>
                  </div>
                  
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    {booking.invoice.paymentStatus === "PAID" && (
                      <Button size="sm" variant="secondary" onClick={handleMarkUnpaid} loading={generating}>
                        Mark Unpaid
                      </Button>
                    )}
                    <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={handleDeleteInvoice} loading={generating} />
                  </div>
                </div>
              ) : (
                <Button fullWidth variant="primary" icon={<FileText size={16} />} onClick={() => setIsInvoiceModalOpen(true)}>
                  Generate Invoice
                </Button>
              )}
            </div>
          </Card>

          {/* Quick Actions Placeholder */}
          <Card padding="lg">
            <h3 style={{ marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Button fullWidth variant="success" icon={<CheckCircle size={16} />} disabled={booking.status !== "CONFIRMED"}>
                Mark as Active (Picked Up)
              </Button>
              <Button fullWidth variant="secondary" icon={<CheckCircle size={16} />} disabled={booking.status !== "ACTIVE"}>
                Complete (Returned)
              </Button>
              <Button fullWidth variant="danger" icon={<XCircle size={16} />} disabled={booking.status === "COMPLETED" || booking.status === "CANCELLED"}>
                Cancel Booking
              </Button>
            </div>
          </Card>

        </div>
      </div>

      <Modal 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Generate Invoice"
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Base Subtotal ({days} Days)</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(baseSubtotal)}</span>
            </div>
          </div>
          <Input 
            label="Extra Charges / Fees ($)" 
            type="number"
            min={0}
            value={invoiceForm.extraCharges}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, extraCharges: Number(e.target.value) })}
          />
          <Input 
            label="Discount Applied ($)" 
            type="number"
            min={0}
            value={invoiceForm.discount}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: Number(e.target.value) })}
          />
          <Input 
            label="Deposit Paid Upfront ($)" 
            type="number"
            min={0}
            value={invoiceForm.depositPaid}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, depositPaid: Number(e.target.value) })}
            hint="Subtracts from final Amount Due"
          />
          <Textarea 
            label="Invoice Notes"
            value={invoiceForm.notes}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
            placeholder="Thank you for your business..."
            rows={2}
          />

          <div style={{ marginTop: "8px" }}>
            <Button fullWidth onClick={handleGenerateInvoice} loading={generating}>
              Confirm & Generate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
