"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CheckCircle, Pencil, Plus, UserCog, UserRound, XCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Textarea } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { createEmployee, updateEmployee, confirmEmployeeSalary } from "@/actions/employees";
import { upsertEmployeeAccount } from "@/actions/companyAuth";
import { useSettings } from "@/lib/SettingsContext";
import { canPerform } from "@/lib/permissions";
import styles from "./employees.module.css";

type SalaryPayment = {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paidAt?: string | null;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  hasSalary: boolean;
  salary?: number | null;
  payDay?: number | null;
  active: boolean;
  notes?: string | null;
  account?: {
    id: string;
    name: string;
    email: string;
    active: boolean;
    lastLoginAt?: string | null;
  } | null;
  salaryPayments: SalaryPayment[];
};

type EmployeeForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  hasSalary: boolean;
  salary: string;
  payDay: string;
  active: boolean;
  notes: string;
};

const emptyForm: EmployeeForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  role: "",
  hasSalary: true,
  salary: "",
  payDay: "1",
  active: true,
  notes: "",
};

function getName(employee: Employee) {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export default function EmployeesClient({
  companyAdmin,
  employees,
  dueEmployees,
  roles,
  month,
  year,
}: {
  companyAdmin: { id: string; companyId: string; companyName: string; name: string; email: string; role?: string; permissions?: string[] };
  employees: Employee[];
  dueEmployees: Employee[];
  roles: { id: string; name: string }[];
  month: number;
  year: number;
}) {
  const { t, formatPrice } = useSettings();
  const { toast } = useToast();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const canAddEmployee = canPerform(companyAdmin, ["ADD_EMPLOYEES"]);
  const canManageEmployees = canPerform(companyAdmin, ["MANAGE_EMPLOYEES"]);
  const [salaryPromptOpen, setSalaryPromptOpen] = useState(() => dueEmployees.length > 0 && canManageEmployees);
  const [pendingSalaryEmployees, setPendingSalaryEmployees] = useState(dueEmployees);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountEmployee, setAccountEmployee] = useState<Employee | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    password: "",
    active: true,
  });

  const activeEmployees = employees.filter((employee) => employee.active).length;
  const monthlyPayroll = employees
    .filter((employee) => employee.active && employee.hasSalary)
    .reduce((total, employee) => total + (employee.salary || 0), 0);

  const openCreate = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone || "",
      email: employee.email || "",
      role: employee.role || "",
      hasSalary: employee.hasSalary,
      salary: employee.salary ? String(employee.salary) : "",
      payDay: employee.payDay ? String(employee.payDay) : "1",
      active: employee.active,
      notes: employee.notes || "",
    });
    setIsFormOpen(true);
  };

  const openAccountModal = (employee: Employee) => {
    setAccountEmployee(employee);
    setAccountForm({
      name: employee.account?.name || getName(employee),
      email: employee.account?.email || employee.email || "",
      password: "",
      active: employee.account?.active ?? true,
    });
    setAccountModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const salary = form.hasSalary ? Number(form.salary) : undefined;
    const payDay = form.hasSalary ? Number(form.payDay) : undefined;

    setLoading(true);
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email,
      role: form.role,
      hasSalary: form.hasSalary,
      salary,
      payDay,
      active: form.active,
      notes: form.notes,
    };

    const result = editingEmployee
      ? await updateEmployee(editingEmployee.id, payload)
      : await createEmployee(payload);

    setLoading(false);

    if (result.success) {
      toast(editingEmployee ? t("employees.updated") : t("employees.added"), "success");
      setIsFormOpen(false);
      setEditingEmployee(null);
      setForm(emptyForm);
    } else {
      toast(result.message, "error");
    }
  };

  const handleSalaryConfirmation = async (employeeId: string, status: "PAID" | "NOT_PAID") => {
    setConfirmingId(employeeId);
    const result = await confirmEmployeeSalary(employeeId, status);
    setConfirmingId(null);

    if (result.success) {
      toast(status === "PAID" ? t("employees.salaryPaid") : t("employees.salaryNotPaid"), "success");
      setPendingSalaryEmployees((current) => {
        const next = current.filter((employee) => employee.id !== employeeId);
        if (next.length === 0) setSalaryPromptOpen(false);
        return next;
      });
      window.dispatchEvent(new Event("employees:updated"));
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  };

  const handleSaveAccount = async () => {
    if (!accountEmployee) return;

    setLoading(true);
    const result = await upsertEmployeeAccount({
      employeeId: accountEmployee.id,
      ...accountForm,
    });
    setLoading(false);

    if (result.success) {
      toast(result.message, "success");
      setAccountModalOpen(false);
      setAccountEmployee(null);
      setAccountForm({ name: "", email: "", password: "", active: true });
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  };

  const columns = [
    {
      key: "name",
      label: t("label.name"),
      render: (employee: Employee) => (
        <div className={styles.employeeName}>
          <span>{getName(employee)}</span>
          {employee.role && <small>{employee.role}</small>}
        </div>
      ),
    },
    {
      key: "salary",
      label: t("employees.salary"),
      render: (employee: Employee) => employee.hasSalary && employee.salary ? <strong>{formatPrice(employee.salary)}</strong> : "—",
    },
    {
      key: "payDay",
      label: t("employees.payDay"),
      render: (employee: Employee) => employee.hasSalary && employee.payDay ? `${employee.payDay}` : "—",
    },
    {
      key: "status",
      label: t("label.status"),
      render: (employee: Employee) => (
        <Badge variant={employee.active ? "success" : "default"} size="sm">
          {employee.active ? t("status.active") : t("employees.inactive")}
        </Badge>
      ),
    },
    {
      key: "payment",
      label: t("employees.thisMonth"),
      render: (employee: Employee) => {
        const payment = employee.salaryPayments[0];
        if (!employee.hasSalary) return <Badge variant="default" size="sm">{t("employees.noSalary")}</Badge>;
        if (!payment) return <Badge variant="warning" size="sm">{t("status.pending")}</Badge>;
        return (
          <Badge variant={payment.status === "PAID" ? "success" : "danger"} size="sm">
            {payment.status === "PAID" ? t("status.paid") : t("employees.notPaid")}
          </Badge>
        );
      },
    },
    {
      key: "account",
      label: "Account",
      render: (employee: Employee) => (
        employee.account ? (
          <div>
            <div style={{ fontWeight: 600 }}>{employee.account.email}</div>
            <small style={{ color: "var(--text-tertiary)" }}>
              {employee.account.active ? "Active" : "Disabled"}
            </small>
          </div>
        ) : (
          <span style={{ color: "var(--text-tertiary)" }}>No account</span>
        )
      ),
    },
    {
      key: "actions",
      label: t("label.actions"),
      align: "right" as const,
      render: (employee: Employee) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          {canManageEmployees && (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={<UserCog size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  openAccountModal(employee);
                }}
              >
                Account
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Pencil size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(employee);
                }}
              >
                {t("action.edit")}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <BriefcaseBusiness size={24} />
          {t("employees.title")}
        </h1>
        {canAddEmployee && (
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            {t("employees.addEmployee")}
          </Button>
        )}
      </div>



      <div className={styles.summaryGrid}>
        <Card padding="md">
          <div className={styles.summaryItem}>
            <div className={styles.summaryIcon}><UserRound size={20} /></div>
            <div>
              <span>{t("employees.activeEmployees")}</span>
              <strong>{activeEmployees}</strong>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className={styles.summaryItem}>
            <div className={styles.summaryIcon}><BriefcaseBusiness size={20} /></div>
            <div>
              <span>{t("employees.monthlyPayroll")}</span>
              <strong>{formatPrice(monthlyPayroll)}</strong>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className={styles.summaryItem}>
            <div className={styles.summaryIcon}><CheckCircle size={20} /></div>
            <div>
              <span>{t("employees.dueNow")}</span>
              <strong>{pendingSalaryEmployees.length}</strong>
            </div>
          </div>
        </Card>
      </div>

      {pendingSalaryEmployees.length > 0 && (
        <Card padding="md" className={styles.dueCard}>
          <div className={styles.dueHeader}>
            <div>
              <h3>{t("employees.salaryDueTitle")}</h3>
              <p>{t("employees.salaryDueDesc")}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSalaryPromptOpen(true)}>
              {t("action.confirm")}
            </Button>
          </div>
        </Card>
      )}

      <Table
        columns={columns}
        data={employees}
        keyExtractor={(employee) => employee.id}
        emptyMessage={t("employees.noEmployees")}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          if (!loading) setIsFormOpen(false);
        }}
        title={editingEmployee ? t("employees.editEmployee") : t("employees.addEmployee")}
        size="md"
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <Input label={t("employees.firstName")} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label={t("employees.lastName")} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label={t("label.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label={t("label.email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select
              label={t("employees.role")}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={roles.map((role) => ({ value: role.name, label: role.name }))}
              placeholder={t("employees.selectRole")}
            />
            <label className={styles.checkField}>
              <input type="checkbox" checked={form.hasSalary} onChange={(e) => setForm({ ...form, hasSalary: e.target.checked })} />
              <span>{t("employees.hasSalary")}</span>
            </label>
            {form.hasSalary && (
              <>
                <Input label={t("employees.salary")} type="number" min={0} required value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                <Input label={t("employees.payDay")} type="number" min={1} max={31} required value={form.payDay} onChange={(e) => setForm({ ...form, payDay: e.target.value })} />
              </>
            )}
            <label className={styles.checkField}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span>{t("status.active")}</span>
            </label>
          </div>
          <Textarea label={t("label.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>{t("action.cancel")}</Button>
            <Button type="submit" loading={loading}>{editingEmployee ? t("action.saveChanges") : t("action.save")}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={salaryPromptOpen}
        onClose={() => setSalaryPromptOpen(false)}
        title={t("employees.salaryDueTitle")}
        size="md"
      >
        <div className={styles.salaryPrompt}>
          <p>{t("employees.salaryPeriod")} {month}/{year}</p>
          {pendingSalaryEmployees.map((employee) => (
            <div key={employee.id} className={styles.salaryPromptRow}>
              <div>
                <strong>{getName(employee)}</strong>
                <span>{formatPrice(employee.salary || 0)} - {t("employees.payDay")} {employee.payDay}</span>
              </div>
              <div className={styles.salaryPromptActions}>
                <Button
                  size="sm"
                  variant="success"
                  loading={confirmingId === employee.id}
                  icon={<CheckCircle size={14} />}
                  onClick={() => handleSalaryConfirmation(employee.id, "PAID")}
                >
                  {t("employees.markPaid")}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={confirmingId === employee.id}
                  icon={<XCircle size={14} />}
                  onClick={() => handleSalaryConfirmation(employee.id, "NOT_PAID")}
                >
                  {t("employees.markNotPaid")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={accountModalOpen}
        onClose={() => {
          if (!loading) setAccountModalOpen(false);
        }}
        title={accountEmployee?.account ? "Modify Employee Account" : "Create Employee Account"}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "var(--text-secondary)" }}>{accountEmployee ? getName(accountEmployee) : ""}</p>
          <Input
            label="Account Name"
            required
            value={accountForm.name}
            onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
          />
          <Input
            label="Login Email"
            type="email"
            required
            value={accountForm.email}
            onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
          />
          <Input
            label={accountEmployee?.account ? "New Password" : "Password"}
            type="password"
            required={!accountEmployee?.account}
            value={accountForm.password}
            onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
            hint={accountEmployee?.account ? "Leave empty to keep the current password" : "Required for a new employee account"}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            <input
              type="checkbox"
              checked={accountForm.active}
              onChange={(e) => setAccountForm({ ...accountForm, active: e.target.checked })}
            />
            Account active
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <Button type="button" variant="secondary" onClick={() => setAccountModalOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="button" loading={loading} onClick={handleSaveAccount}>
              Save Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
