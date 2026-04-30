"use client";
import { useSettings } from "@/lib/SettingsContext";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, User, Car, Calendar, DollarSign, CreditCard, History, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { updatePaymentStatus, deleteInvoice } from "@/actions/invoices";
import { formatDate, getFullName } from "@/lib/utils";
import styles from "../invoices.module.css";

export default function InvoiceDetailClient({ invoice }: { invoice: any }) {
  const { formatPrice: formatCurrency, t } = useSettings();

  const router = useRouter();
  const { toast } = useToast();
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: invoice.amountDue, method: "ESPECE" });
  const [processing, setProcessing] = useState(false);

  const start = new Date(invoice.booking.startDate);
  const end = new Date(invoice.booking.endDate);
  const days = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  // Parse payment history from notes: [Payment: x via YYY]
  const paymentLogs = [];
  if (invoice.notes) {
    const regex = /\[Payment: ([\d.]+) via ([A-Z]+)\]/g;
    let match;
    while ((match = regex.exec(invoice.notes)) !== null) {
      paymentLogs.push({
        amount: parseFloat(match[1]),
        method: match[2],
      });
    }
  }

  const submitPayment = async () => {
    if (paymentForm.amount <= 0) {
      toast("Invalid amount", "error");
      return;
    }
    
    const isFullPayment = paymentForm.amount >= invoice.amountDue;
    const finalStatus = isFullPayment ? "PAID" : "PARTIAL";

    setProcessing(true);
    setPaymentModalOpen(false);
    
    const res = await updatePaymentStatus(invoice.id, finalStatus, paymentForm.amount, false, paymentForm.method);
    setProcessing(false);
    
    if (res.success) {
      toast("Payment recorded successfully", "success");
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const handleMarkUnpaid = async () => {
    setProcessing(true);
    const res = await updatePaymentStatus(invoice.id, "PENDING", 0, false);
    setProcessing(false);
    if (res.success) {
      toast("Invoice reverted to PENDING", "success");
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const handleDeleteInvoice = async () => {
    setProcessing(true);
    const res = await deleteInvoice(invoice.id);
    setProcessing(false);
    if (res.success) {
      toast("Invoice deleted", "success");
      router.push("/invoices");
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className={`page-header ${styles.pageHeader}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
          <h1 style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {t("invoices.details")}
            <Badge 
              variant={invoice.paymentStatus === "PAID" ? "success" : invoice.paymentStatus === "PARTIAL" ? "info" : "warning"}
            >
              {invoice.paymentStatus === "PARTIAL" ? t("invoices.partiallyPaid") : invoice.paymentStatus}
            </Badge>
          </h1>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>ID: {invoice.id}</span>
        </div>
        <div className={styles.detailActionRow}>
          {invoice.paymentStatus !== "PAID" && (
            <Button variant="success" icon={<CreditCard size={16} />} onClick={() => setPaymentModalOpen(true)}>
              {t("invoices.recordPayment")}
            </Button>
          )}
          {invoice.paymentStatus === "PAID" && (
            <Button variant="secondary" icon={<XCircle size={16} />} onClick={handleMarkUnpaid} loading={processing}>
              {t("invoices.markUnpaid")}
            </Button>
          )}
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={handleDeleteInvoice} loading={processing}>
            {t("action.delete")}
          </Button>
          <Link href={`/invoices/${invoice.id}/print`}>
            <Button variant="secondary" icon={<Printer size={16} />}>
              {t("action.print")}
            </Button>
          </Link>
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => router.back()}>
            {t("action.back")}
          </Button>
        </div>
      </div>

      <div className={styles.detailGrid}>
        
        {/* Left Column */}
        <div className={styles.detailLeftCol}>
          <Card padding="lg">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <User size={16} /> {t("invoices.customerBooking")}
            </h3>
            
            <div className={styles.detailCustomerGrid}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{t("bookings.broker")}</div>
                <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>{getFullName(invoice.booking.customer.firstName, invoice.booking.customer.lastName)}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>{invoice.booking.customer.phone}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{t("bookings.primaryDriver")}</div>
                <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>{getFullName(invoice.booking.driverFirstName || "", invoice.booking.driverLastName || "") || "N/A"}</div>
                
                {invoice.booking.driver2FirstName && (
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{t("bookings.secondDriver")}</div>
                    <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>{getFullName(invoice.booking.driver2FirstName, invoice.booking.driver2LastName)}</div>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{t("bookings.vehicle")}</div>
                <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>{invoice.booking.vehicle.brand} {invoice.booking.vehicle.model}</div>
                <div style={{ padding: "2px 8px", background: "var(--bg-tertiary)", display: "inline-block", borderRadius: "6px", fontSize: "0.75rem", marginTop: "8px", fontWeight: 600 }}>
                  {invoice.booking.vehicle.plateNumber}
                </div>
              </div>
            </div>

            <div className={styles.detailTimeline}>
              <div className={styles.detailTimelineItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <Calendar size={14} /> {t("bookings.pickupDate")}
                </div>
                <div style={{ fontWeight: 600 }}>{formatDate(invoice.booking.startDate)}</div>
              </div>
              <div className={styles.detailTimelineItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <Calendar size={14} /> {t("bookings.returnDate")}
                </div>
                <div style={{ fontWeight: 600 }}>{formatDate(invoice.booking.endDate)}</div>
              </div>
              <div className={styles.detailTimelineItem}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <Clock size={14} /> {t("bookings.duration")}
                </div>
                <div style={{ fontWeight: 600 }}>{days} {t("label.days")}</div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <History size={16} /> {t("invoices.paymentHistory")}
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--info)" }} />
                  <span>{t("invoices.depositPaid")}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.depositPaid)}</span>
              </div>
              
              {paymentLogs.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-tertiary)" }}>
                  {t("invoices.noPayments")}
                </div>
              ) : (
                paymentLogs.map((log, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid var(--border)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle size={16} style={{ color: "var(--success)" }} />
                      <span>{t("invoices.paymentRecordedVia")} <Badge size="sm" variant="default">{log.method}</Badge></span>
                    </div>
                    <span style={{ fontWeight: 600, color: "var(--success)" }}>{formatCurrency(log.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className={styles.detailRightCol}>
          <Card padding="lg">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <DollarSign size={16} /> {t("invoices.summary")}
            </h3>
            
            <div className={styles.detailSummary}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>{t("invoices.subtotal")}</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.extraCharges > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{t("invoices.extraCharges")}</span>
                  <span>{formatCurrency(invoice.extraCharges)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{t("invoices.discount")}</span>
                  <span style={{ color: "var(--success)" }}>-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px dashed var(--border)", fontWeight: 600 }}>
                <span>{t("invoices.totalCalculated")}</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", color: "var(--text-secondary)" }}>
                <span>{t("invoices.totalPaid")}</span>
                <span>-{formatCurrency(invoice.totalAmount - invoice.amountDue)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid var(--border)", fontWeight: 700, fontSize: "1.25rem", color: invoice.amountDue <= 0 ? "var(--success)" : "var(--accent)" }}>
                <span>{t("invoices.amountDue")}</span>
                <span>{formatCurrency(invoice.amountDue)}</span>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Payment Modal entirely replicates the Invoices page flow */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={t("invoices.recordPayment")}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "var(--text-secondary)" }}>{t("invoices.amountDue")}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.amountDue)}</span>
            </div>
          </div>
          <Input 
            label={t("invoices.paymentAmount")} 
            type="number"
            min={0}
            step="0.01"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
          />
          <Select
            label={t("invoices.paymentMethod")}
            options={[
              { value: "ESPECE", label: t("payment.cash") },
              { value: "CARTE", label: t("payment.card") },
              { value: "VIREMENT", label: t("payment.transfer") },
              { value: "CHEQUE", label: t("payment.check") },
            ]}
            value={paymentForm.method}
            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
          />

          <div style={{ marginTop: "8px" }}>
            <Button fullWidth onClick={submitPayment} loading={processing}>
              {t("invoices.confirmPayment")}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
