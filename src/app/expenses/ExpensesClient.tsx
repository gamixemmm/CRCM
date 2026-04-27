"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingDown, Plus, CreditCard, Wallet, Calculator, Pencil, Trash2, Car, ShieldCheck, Home, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import AddExpenseModal from "./AddExpenseModal";
import { deleteExpense } from "@/actions/expenses";
import { useToast } from "@/components/ui/Toast";

interface ExpensesClientProps {
  expenses: any[];
  overallRevenue: number;
  vehicles: any[];
}

const CATEGORY_KEY_MAP: Record<string, string> = {
  "Maintenance": "expenses.cat.maintenance",
  "Vignette": "expenses.cat.vignette",
  "Assurance": "expenses.cat.insurance",
  "Gasoil": "expenses.cat.fuel",
  "Visite technique": "expenses.cat.inspection",
  "Salaire": "expenses.cat.salary",
  "CNSS": "expenses.cat.cnss",
  "Loyer": "expenses.cat.rent",
  "Comptabilité": "expenses.cat.accounting",
  "Autre": "expenses.cat.other",
};

export default function ExpensesClient({ expenses, overallRevenue, vehicles }: ExpensesClientProps) {
  const { t, formatPrice } = useSettings();
  const router = useRouter();
  const { toast } = useToast();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseMode, setExpenseMode] = useState<"general" | "car" | "cnss" | "rent">("general");
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

  const translateCategory = (cat: string) => {
    const key = CATEGORY_KEY_MAP[cat];
    if (key) return t(key as any);
    return cat;
  };

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
        
        const matchesCategory = categoryFilter === "All" || exp.category === categoryFilter;
        
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
          comparison = a.category.localeCompare(b.category);
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
      render: (e: any) => <span style={{ fontWeight: 600 }}>{translateCategory(e.category)}</span>,
    },
    {
      key: "description",
      label: t("expenses.description"),
      render: (e: any) => <span>{e.description || "—"}</span>,
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

  const categories = ["All", ...Object.keys(CATEGORY_KEY_MAP)];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <TrendingDown size={24} />
          {t("expenses.title")}
        </h1>
        <div className="page-header-actions">
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {/* Card: Total Charges */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
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
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
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
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
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

      {/* Filter Bar */}
      <div style={{ 
        background: "var(--bg-secondary)", 
        border: "1px solid var(--border)", 
        borderRadius: "12px", 
        padding: "16px", 
        marginBottom: "24px",
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        alignItems: "flex-end"
      }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{t("action.search")}</label>
          <Input 
            placeholder={t("topbar.search")} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
        
        <div style={{ width: "180px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{t("expenses.category")}</label>
          <Select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            icon={<Filter size={16} />}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === "All" ? t("label.all") : translateCategory(cat)}</option>
            ))}
          </Select>
        </div>

        <div style={{ width: "160px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{t("label.date")} ({t("label.to").split(' ')[0]})</label>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </div>

        <div style={{ width: "160px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{t("label.date")} ({t("label.to")})</label>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>

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

      <Table
        columns={columns}
        data={processedExpenses}
        keyExtractor={(e) => e.id}
        onRowClick={(e) => router.push(`/expenses/${e.id}`)}
        emptyMessage={t("expenses.noExpenses")}
      />

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
