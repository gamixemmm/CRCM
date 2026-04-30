"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, LogOut, Plus, ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import {
  createDeveloperCompany,
  developerLogin,
  developerLogout,
  setDeveloperCompanyActive,
  setDeveloperCompanyAdminActive,
  upsertDeveloperCompanyAdmin,
} from "@/actions/developer";
import { formatDate } from "@/lib/utils";

type CompanyAdmin = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Company = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  active: boolean;
  disabledAt: string | null;
  notes: string | null;
  createdAt: string;
  admin: CompanyAdmin | null;
};

export default function DeveloperClient({
  authenticated,
  companies,
}: {
  authenticated: boolean;
  companies: Company[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [accessKey, setAccessKey] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", contactEmail: "", notes: "" });
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    active: true,
  });

  const stats = {
    total: companies.length,
    active: companies.filter((company) => company.active).length,
    disabled: companies.filter((company) => !company.active).length,
    withAdmin: companies.filter((company) => company.admin).length,
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginLoading(true);
    const result = await developerLogin({ accessKey });
    setLoginLoading(false);

    if (result.success) {
      toast(result.message, "success");
      setAccessKey("");
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  };

  const handleLogout = async () => {
    await developerLogout();
    router.refresh();
  };

  const handleCreateCompany = async () => {
    setSaving(true);
    const result = await createDeveloperCompany(form);
    setSaving(false);

    if (result.success) {
      toast(result.message, "success");
      setModalOpen(false);
      setForm({ name: "", slug: "", contactEmail: "", notes: "" });
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  };

  const handleSetActive = async (company: Company, active: boolean) => {
    const result = await setDeveloperCompanyActive(company.id, active);
    if (result.success) {
      toast(result.message, "success");
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  };

  const openAdminModal = (company: Company) => {
    setSelectedCompany(company);
    setAdminForm({
      name: company.admin?.name || "",
      email: company.admin?.email || company.contactEmail || "",
      password: "",
      active: company.admin?.active ?? true,
    });
    setAdminModalOpen(true);
  };

  const handleSaveAdmin = async () => {
    if (!selectedCompany) return;

    setSaving(true);
    const result = await upsertDeveloperCompanyAdmin({
      companyId: selectedCompany.id,
      ...adminForm,
    });
    setSaving(false);

    if (result.success) {
      toast(result.message, "success");
      setAdminModalOpen(false);
      setSelectedCompany(null);
      setAdminForm({ name: "", email: "", password: "", active: true });
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  };

  const handleSetAdminActive = async (company: Company, active: boolean) => {
    const result = await setDeveloperCompanyAdminActive(company.id, active);
    if (result.success) {
      toast(result.message, "success");
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  };

  if (!authenticated) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: "460px", margin: "80px auto" }}>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "28px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "10px", background: "var(--accent-muted)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
            <Lock size={22} />
          </div>
          <h1 style={{ marginBottom: "8px" }}>Developer Access</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "22px", lineHeight: 1.5 }}>
            Enter the developer admin key to manage all companies.
          </p>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Input
              label="Access Key"
              type="password"
              required
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              placeholder="Developer admin key"
            />
            <Button type="submit" loading={loginLoading} icon={<ShieldCheck size={16} />}>
              Unlock Developer Console
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "company",
      label: "Company",
      render: (company: Company) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", background: "var(--bg-tertiary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{company.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{company.slug}</div>
          </div>
        </div>
      ),
    },
    { key: "contact", label: "Contact", render: (company: Company) => company.contactEmail || "-" },
    {
      key: "admin",
      label: "Admin",
      render: (company: Company) => (
        company.admin ? (
          <div>
            <div style={{ fontWeight: 600 }}>{company.admin.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{company.admin.email}</div>
            {!company.admin.active && (
              <div style={{ marginTop: "4px" }}>
                <Badge variant="warning">Admin disabled</Badge>
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "var(--text-tertiary)" }}>No admin</span>
        )
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (company: Company) => (
        company.active ? (
          <Badge variant="success" icon={<ShieldCheck size={12} />}>Active</Badge>
        ) : (
          <Badge variant="danger" icon={<ShieldOff size={12} />}>Disabled</Badge>
        )
      ),
    },
    { key: "created", label: "Created", render: (company: Company) => formatDate(company.createdAt) },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (company: Company) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
          <Button size="sm" variant="secondary" icon={<UserCog size={14} />} onClick={() => openAdminModal(company)}>
            Admin
          </Button>
          {company.admin && (
            company.admin.active ? (
              <Button size="sm" variant="secondary" onClick={() => handleSetAdminActive(company, false)}>
                Disable Admin
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => handleSetAdminActive(company, true)}>
                Enable Admin
              </Button>
            )
          )}
          {company.active ? (
            <Button size="sm" variant="secondary" onClick={() => handleSetActive(company, false)}>
              Disable
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleSetActive(company, true)}>
              Enable
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>
          <ShieldCheck size={24} />
          Developer Console
        </h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="secondary" icon={<LogOut size={16} />} onClick={handleLogout}>
            Lock
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Add Company
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Total Companies</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{stats.total}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--success)", fontSize: "0.875rem" }}>Active</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success)" }}>{stats.active}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--danger)", fontSize: "0.875rem" }}>Disabled</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--danger)" }}>{stats.disabled}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
          <div style={{ color: "var(--accent)", fontSize: "0.875rem" }}>With Admin</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent)" }}>{stats.withAdmin}</div>
        </div>
      </div>

      <Table columns={columns} data={companies} keyExtractor={(company) => company.id} emptyMessage="No companies added yet." />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Company" size="sm">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input label="Company Name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} hint="Leave empty to generate from the company name" />
          <Input label="Contact Email" type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              style={{ width: "100%", minHeight: "86px", padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleCreateCompany}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={adminModalOpen}
        onClose={() => {
          setAdminModalOpen(false);
          setSelectedCompany(null);
        }}
        title={selectedCompany?.admin ? "Modify Admin Account" : "Create Admin Account"}
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {selectedCompany?.name}
          </p>
          <Input
            label="Admin Name"
            required
            value={adminForm.name}
            onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })}
          />
          <Input
            label="Admin Email"
            type="email"
            required
            value={adminForm.email}
            onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })}
          />
          <Input
            label={selectedCompany?.admin ? "New Password" : "Password"}
            type="password"
            required={!selectedCompany?.admin}
            value={adminForm.password}
            onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })}
            hint={selectedCompany?.admin ? "Leave empty to keep the current password" : "Required for a new admin account"}
          />
          <label style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            <input
              type="checkbox"
              checked={adminForm.active}
              onChange={(event) => setAdminForm({ ...adminForm, active: event.target.checked })}
            />
            Admin account active
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <Button type="button" variant="ghost" onClick={() => setAdminModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleSaveAdmin}>
              Save Admin
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
