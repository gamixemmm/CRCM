"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown, Plus, CreditCard, Wallet, Calculator, Pencil, Trash2, Car, ShieldCheck, Home, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import AddExpenseModal from "./AddExpenseModal";
import { deleteExpense } from "@/actions/expenses";
import { useToast } from "@/components/ui/Toast";
import { EXPENSE_CATEGORIES, normalizeExpenseCategory, translateExpenseCategory, translateExpenseDescription } from "@/lib/expenseCategories";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import styles from "./expenses.module.css";

interface ExpensesClientProps {
  expenses: any[];
  overallRevenue: number;
  vehicles: any[];
}

export default function ExpensesClient({ expenses, overallRevenue, vehicles }: ExpensesClientProps) {
  const { t, formatPrice } = useSettings();
  const router = useRouter();
  const { toast } = useToast();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseMode, setExpenseMode] = useState<"general" | "car" | "cnss" | "rent" | "accounting">("general");
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const totalCharges = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const reste = overallRevenue - totalCharges;

  const handleEdit = (expense: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpenseMode("general");
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("expenses.deleteConfirm"))) return;
    setDeletingId(id);
    const res = await deleteExpense(id);
    setDeletingId(null);
    if (res.success) {
      toast(t("expenses.deleted"), "success");
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  // Filter & Sort Logic
  const processedExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        const matchesSearch = searchQuery === "" || 
          (exp.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (exp.vehicle?.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (exp.vehicle?.brand?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesCategory = categoryFilter === "All" || normalizeExpenseCategory(exp.category) === categoryFilter;
        
        const expDate = new Date(exp.date).toISOString().split('T')[0];
        const matchesStartDate = startDate === "" || expDate >= startDate;
        const matchesEndDate = endDate === "" || expDate <= endDate;
        
        return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === "date") {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortBy === "amount") {
          comparison = a.amount - b.amount;
        } else if (sortBy === "category") {
          comparison = normalizeExpenseCategory(a.category).localeCompare(normalizeExpenseCategory(b.category));
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [expenses, searchQuery, categoryFilter, startDate, endDate, sortBy, sortOrder]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortBy !== columnKey) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const columns = [
    {
      key: "date",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => handleSort("date")}>
          {t("label.date")} <SortIcon columnKey="date" />
        </div>
      ),
      render: (e: any) => <span>{formatDate(e.date)}</span>,
    },
    {
      key: "category",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => handleSort("category")}>
          {t("expenses.category")} <SortIcon columnKey="category" />
        </div>
      ),
      render: (e: any) => <span style={{ fontWeight: 600 }}>{translateExpenseCategory(e.category, t)}</span>,
    },
    {
      key: "description",
      label: t("expenses.description"),
      render: (e: any) => <span>{translateExpenseDescription(e.description, t) || "—"}</span>,
    },
    {
      key: "vehicle",
      label: t("expenses.vehicle"),
      render: (e: any) => e.vehicle ? (
        <span style={{ color: "var(--text-secondary)" }}>
          {e.vehicle.brand} {e.vehicle.model} - {e.vehicle.plateNumber}
        </span>
      ) : (
        "—"
      ),
    },
    {
      key: "amount",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => handleSort("amount")}>
          {t("expenses.amount")} <SortIcon columnKey="amount" />
        </div>
      ),
      render: (e: any) => (
        <span style={{ fontWeight: "bold", color: "var(--error)" }}>
          {formatPrice(e.amount)}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("label.actions"),
      align: "right" as const,
      render: (exp: any) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => handleEdit(exp, e)}
            icon={<Pencil size={14} />}
          >
            {t("expenses.edit")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={deletingId === exp.id}
            onClick={(e) => handleDelete(exp.id, e)}
            icon={<Trash2 size={14} />}
          />
        </div>
      ),
    },
  ];

  const mobileCards = processedExpenses.map((e) => (
    <Card
      key={e.id}
      hover
      padding="md"
      className={styles.mobileCard}
      onClick={() => router.push(`/expenses/${e.id}`)}
    >
      <div className={styles.mobileCardTop}>
        <div className={styles.mobileCardTitle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
              {formatDate(e.date)}
            </span>
            <Badge size="sm" variant="default">
              {translateExpenseCategory(e.category, t)}
            </Badge>
          </div>
          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
            {translateExpenseDescription(e.description, t) || "-"}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            {e.vehicle ? `${e.vehicle.brand} ${e.vehicle.model} - ${e.vehicle.plateNumber}` : "—"}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0, marginTop: "4px" }} />
      </div>

      <div className={styles.mobileMetaGrid}>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("expenses.amount")}</span>
          <span className={styles.mobileAmount}>{formatPrice(e.amount)}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("expenses.category")}</span>
          <span className={styles.mobileMetaValue}>{translateExpenseCategory(e.category, t)}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("expenses.vehicle")}</span>
          <span className={styles.mobileMetaValue}>
            {e.vehicle ? `${e.vehicle.brand} ${e.vehicle.model}` : "—"}
          </span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("label.actions")}</span>
          <span className={styles.mobileMetaValue}>{t("action.view")}</span>
        </div>
      </div>

      <div className={styles.mobileFooter} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>
          {t("label.date")}: {formatDate(e.date)}
        </div>
        <div className={styles.mobileActions}>
          <Button
            size="sm"
            variant="secondary"
            onClick={(ev) => handleEdit(e, ev)}
            icon={<Pencil size={14} />}
          >
            {t("expenses.edit")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={deletingId === e.id}
            onClick={(ev) => handleDelete(e.id, ev)}
            icon={<Trash2 size={14} />}
          />
        </div>
      </div>
    </Card>
  ));

  const categories = ["All", ...EXPENSE_CATEGORIES];

  return (
    <div className="animate-fade-in">
      <div className={`page-header ${styles.pageHeader}`}>
        <h1>
          <TrendingDown size={24} />
          {t("expenses.title")}
        </h1>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            icon={<Calculator size={16} />}
            onClick={() => {
              setExpenseMode("accounting");
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
          >
            {t("expenses.addAccountingPayment")}
          </Button>
          <Button
            variant="secondary"
            icon={<Home size={16} />}
            onClick={() => {
              setExpenseMode("rent");
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
          >
            {t("expenses.addRentPayment")}
          </Button>
          <Button
            variant="secondary"
            icon={<ShieldCheck size={16} />}
            onClick={() => {
              setExpenseMode("cnss");
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
          >
            {t("expenses.addCnssPayment")}
          </Button>
          <Button
            variant="secondary"
            icon={<Car size={16} />}
            onClick={() => {
              setExpenseMode("car");
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
          >
            {t("expenses.addCarExpense")}
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {/* Card: Total Charges */}
        <div className={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--error)" }}>
            <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
              <CreditCard size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              {t("expenses.totalCharges")}
            </h3>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
            {formatPrice(totalCharges)}
          </div>
        </div>

        {/* Card: Cash Amount (Overall Revenue from invoices) */}
        <div className={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--success)" }}>
            <div style={{ padding: "10px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px" }}>
              <Wallet size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              {t("expenses.cashAmount")}
            </h3>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
            {formatPrice(overallRevenue)}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "8px" }}>
            {t("expenses.cashSubtitle")}
          </div>
        </div>

        {/* Card: Remainder = Revenue - Charges */}
        <div className={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "var(--accent)" }}>
            <div style={{ padding: "10px", background: "var(--accent-muted)", borderRadius: "8px" }}>
              <Calculator size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>
              {t("expenses.remainder")}
            </h3>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: reste < 0 ? "var(--error)" : "var(--success)" }}>
            {formatPrice(reste)}
          </div>
        </div>
      </div>

      <div className={styles.mobileStatsPanel}>
        <div className={styles.mobileStatsHeader}>
          <div className={styles.mobileStatsIntro}>
            <div className={styles.mobileStatsLabel}>{t("expenses.totalCharges")}</div>
            <div className={styles.mobileStatsValue}>{formatPrice(totalCharges)}</div>
            <div className={styles.mobileStatsSub}>{t("expenses.cashSubtitle")}</div>
          </div>
          <div style={{ padding: "8px 10px", borderRadius: "999px", background: "rgba(239, 68, 68, 0.12)", color: "var(--error)", fontSize: "0.75rem", fontWeight: 700 }}>
            {formatPrice(reste)}
          </div>
        </div>

        <div className={styles.mobileStatsList}>
          <div className={styles.mobileStatsItem}>
            <div className={styles.mobileStatsItemLabel}>
              <span className={styles.mobileStatsDot} style={{ background: "var(--success)" }} />
              {t("expenses.cashAmount")}
            </div>
            <div className={styles.mobileStatsItemValue} style={{ color: "var(--success)" }}>
              {formatPrice(overallRevenue)}
            </div>
          </div>
          <div className={styles.mobileStatsItem}>
            <div className={styles.mobileStatsItemLabel}>
              <span className={styles.mobileStatsDot} style={{ background: reste < 0 ? "var(--error)" : "var(--accent)" }} />
              {t("expenses.remainder")}
            </div>
            <div className={styles.mobileStatsItemValue} style={{ color: reste < 0 ? "var(--error)" : "var(--accent)" }}>
              {formatPrice(reste)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterField}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{t("action.search")}</label>
          <Input 
            placeholder={t("topbar.search")} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
        
        <div className={styles.filterFieldNarrow}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{t("expenses.category")}</label>
          <Select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            icon={<Filter size={16} />}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === "All" ? t("label.all") : translateExpenseCategory(cat, t)}</option>
            ))}
          </Select>
        </div>

        <div className={styles.filterFieldNarrow}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{t("label.date")} ({t("label.to").split(' ')[0]})</label>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </div>

        <div className={styles.filterFieldNarrow}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{t("label.date")} ({t("label.to")})</label>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>

        <div className={styles.filterActions}>
          <Button 
            variant="ghost" 
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("All");
              setStartDate("");
              setEndDate("");
              setSortBy("date");
              setSortOrder("desc");
            }}
          >
            {t("calendar.clear")}
          </Button>
        </div>
      </div>

      <div className={styles.desktopTable}>
        <Table
          columns={columns}
          data={processedExpenses}
          keyExtractor={(e) => e.id}
          onRowClick={(e) => router.push(`/expenses/${e.id}`)}
          emptyMessage={t("expenses.noExpenses")}
        />
      </div>

      <div className={styles.mobileList}>
        {mobileCards}
        {processedExpenses.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <TrendingDown size={44} />
            <h3>{t("expenses.noExpenses")}</h3>
            <p>{t("topbar.search")}</p>
          </div>
        )}
      </div>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        vehicles={vehicles}
        editingExpense={editingExpense}
        mode={expenseMode}
      />
    </div>
  );
}
