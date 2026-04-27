"use client";

import { useState } from "react";
import { useSettings, CurrencyCode, LanguageCode } from "@/lib/SettingsContext";
import Card from "@/components/ui/Card";
import { Settings, DollarSign, Euro, Banknote, Globe, BriefcaseBusiness, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createEmployeeRole, updateEmployeeRole } from "@/actions/employees";
import { useToast } from "@/components/ui/Toast";

export default function SettingsClient({
  employeeRoles,
}: {
  employeeRoles: { id: string; name: string }[];
}) {
  const { currency, setCurrency, language, setLanguage, t } = useSettings();
  const { toast } = useToast();
  const [roles, setRoles] = useState(employeeRoles);
  const [newRole, setNewRole] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const currencies: { code: CurrencyCode; label: string; icon: React.ReactNode }[] = [
    { code: "MAD", label: "Moroccan Dirham", icon: <Banknote size={20} /> },
    { code: "EUR", label: "Euro", icon: <Euro size={20} /> },
    { code: "USD", label: "US Dollar", icon: <DollarSign size={20} /> },
  ];

  const languages: { code: LanguageCode; label: string; nativeLabel: string; flag: string }[] = [
    { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
    { code: "fr", label: "Français", nativeLabel: "Français", flag: "🇫🇷" },
    { code: "ar", label: "العربية", nativeLabel: "العربية", flag: "🇲🇦" },
  ];

  const handleAddRole = async () => {
    setSavingRole(true);
    const result = await createEmployeeRole(newRole);
    setSavingRole(false);

    if (result.success && result.data) {
      setRoles((current) => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewRole("");
      toast(t("settings.roleAdded"), "success");
    } else {
      toast(result.message, "error");
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRoleId) return;
    setSavingRole(true);
    const result = await updateEmployeeRole(editingRoleId, editingRoleName);
    setSavingRole(false);

    if (result.success && result.data) {
      setRoles((current) =>
        current.map((role) => (role.id === editingRoleId ? result.data : role)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingRoleId(null);
      setEditingRoleName("");
      toast(t("settings.roleUpdated"), "success");
    } else {
      toast(result.message, "error");
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "800px" }}>
      <div className="page-header">
        <h1>
          <Settings size={24} />
          {t("settings.title")}
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Currency Card */}
        <Card padding="lg">
          <div style={{ marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "1.125rem", color: "var(--text-primary)" }}>{t("settings.currency")}</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
              {t("settings.currencyDesc")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {currencies.map((c) => {
              const isActive = currency === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: isActive ? "2px solid var(--accent)" : "2px solid var(--border)",
                    background: isActive ? "var(--accent-muted)" : "var(--bg-secondary)",
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: isActive ? "var(--accent)" : "var(--bg-tertiary)",
                    color: isActive ? "white" : "var(--text-primary)",
                  }}>
                    {c.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>{c.code}</div>
                    <div style={{ fontSize: "0.8125rem", opacity: 0.8 }}>{c.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Language Card */}
        <Card padding="lg">
          <div style={{ marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.125rem", color: "var(--text-primary)" }}>
              <Globe size={18} /> {t("settings.language")}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
              {t("settings.languageDesc")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {languages.map((l) => {
              const isActive = language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: isActive ? "2px solid var(--accent)" : "2px solid var(--border)",
                    background: isActive ? "var(--accent-muted)" : "var(--bg-secondary)",
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: isActive ? "var(--accent)" : "var(--bg-tertiary)",
                    fontSize: "1.25rem",
                  }}>
                    {l.flag}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>{l.nativeLabel}</div>
                    <div style={{ fontSize: "0.8125rem", opacity: 0.8 }}>{l.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card padding="lg">
          <div style={{ marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.125rem", color: "var(--text-primary)" }}>
              <BriefcaseBusiness size={18} /> {t("settings.employeeRoles")}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
              {t("settings.employeeRolesDesc")}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "end", marginBottom: "16px" }}>
            <Input
              label={t("settings.newRole")}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRole();
                }
              }}
            />
            <Button type="button" loading={savingRole && !editingRoleId} onClick={handleAddRole}>
              {t("action.add")}
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {roles.map((role) => (
              <div
                key={role.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  background: "var(--bg-secondary)",
                }}
              >
                {editingRoleId === role.id ? (
                  <>
                    <Input
                      value={editingRoleName}
                      onChange={(e) => setEditingRoleName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleUpdateRole();
                        }
                      }}
                    />
                    <Button type="button" size="sm" loading={savingRole} onClick={handleUpdateRole}>
                      {t("action.save")}
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setEditingRoleId(null)}>
                      {t("action.cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <strong style={{ color: "var(--text-primary)" }}>{role.name}</strong>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={<Pencil size={14} />}
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setEditingRoleName(role.name);
                      }}
                    >
                      {t("action.edit")}
                    </Button>
                  </>
                )}
              </div>
            ))}
            {roles.length === 0 && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                {t("settings.noRoles")}
              </p>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
