"use client";

import { useState } from "react";
import { useSettings, CurrencyCode, LanguageCode } from "@/lib/SettingsContext";
import Card from "@/components/ui/Card";
import { Settings, DollarSign, Euro, Banknote, Globe, BriefcaseBusiness, Pencil, Database, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createEmployeeRole, deleteEmployeeRole, updateEmployeeRole } from "@/actions/employees";
import { extractCompanyData } from "@/actions/dataExport";
import { useToast } from "@/components/ui/Toast";
import { PERMISSIONS, canPerform, getPermissionLabel } from "@/lib/permissions";
import { Trash2 } from "lucide-react";

export default function SettingsClient({
  employeeRoles,
  session,
}: {
  employeeRoles: { id: string; name: string; permissions?: string[] }[];
  session: { role?: string; permissions?: string[] } | null;
}) {
  const { currency, setCurrency, language, setLanguage, t } = useSettings();
  const { toast } = useToast();
  const [roles, setRoles] = useState(employeeRoles);
  const [newRole, setNewRole] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([]);
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>(() => PERMISSIONS.map((permission) => permission.id));
  const [savingRole, setSavingRole] = useState(false);
  const [extractingData, setExtractingData] = useState(false);

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
    const result = await createEmployeeRole(newRole, newRolePermissions);
    setSavingRole(false);

    if (result.success && result.data) {
      setRoles((current) => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewRole("");
      setNewRolePermissions(PERMISSIONS.map((permission) => permission.id));
      toast(t("settings.roleAdded"), "success");
    } else {
      toast(result.message, "error");
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRoleId) return;
    setSavingRole(true);
    const result = await updateEmployeeRole(editingRoleId, editingRoleName, editingRolePermissions);
    setSavingRole(false);

    if (result.success && result.data) {
      setRoles((current) =>
        current.map((role) => (role.id === editingRoleId ? result.data : role)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingRoleId(null);
      setEditingRoleName("");
      setEditingRolePermissions([]);
      toast(t("settings.roleUpdated"), "success");
    } else {
      toast(result.message, "error");
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    const confirmed = window.confirm(`Delete the role "${roleName}"?`);
    if (!confirmed) return;

    setSavingRole(true);
    const result = await deleteEmployeeRole(roleId);
    setSavingRole(false);

    if (result.success) {
      setRoles((current) => current.filter((role) => role.id !== roleId));
      if (editingRoleId === roleId) {
        setEditingRoleId(null);
        setEditingRoleName("");
        setEditingRolePermissions([]);
      }
      toast(result.message, "success");
    } else {
      toast(result.message, "error");
    }
  };

  const handleExtractData = async () => {
    setExtractingData(true);
    const result = await extractCompanyData();
    setExtractingData(false);

    if (!result.success || !result.content || !result.filename) {
      toast(result.message, "error");
      return;
    }

    const blob = new Blob([result.content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(t("settings.extractDataSuccess"), "success");
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

        {canPerform(session, ["EXPORT_DATA"]) && (
          <Card padding="lg">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                  <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.125rem", color: "var(--text-primary)" }}>
                    <Database size={18} /> {t("settings.extractData")}
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px", lineHeight: 1.5 }}>
                    {t("settings.extractDataDesc")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                icon={<Download size={16} />}
                loading={extractingData}
                onClick={handleExtractData}
              >
                {t("settings.downloadData")}
              </Button>
            </div>
          </Card>
        )}

        {canPerform(session, ["VIEW_ROLES"]) && (
          <Card padding="lg">
            <div style={{ marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.125rem", color: "var(--text-primary)" }}>
                <BriefcaseBusiness size={18} /> {t("settings.employeeRoles")}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
                {t("settings.employeeRolesDesc")}
              </p>
            </div>

          {canPerform(session, ["ADD_ROLES"]) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px", padding: "16px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <h4 style={{ margin: 0, fontSize: "0.9375rem" }}>Create New Role</h4>
              <div style={{ display: "flex", gap: "10px", alignItems: "end" }}>
                <div style={{ flex: 1 }}>
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
                </div>
                <Button type="button" loading={savingRole && !editingRoleId} onClick={handleAddRole}>
                  {t("action.add")}
                </Button>
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "8px", display: "block", fontWeight: 600 }}>Permissions</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
                  {PERMISSIONS.map(p => (
                    <label key={`new-${p.id}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={newRolePermissions.includes(p.id)} 
                        onChange={(e) => {
                          if (e.target.checked) setNewRolePermissions([...newRolePermissions, p.id]);
                          else setNewRolePermissions(newRolePermissions.filter(x => x !== p.id));
                        }} 
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <Input
                          label="Role Name"
                          value={editingRoleName}
                          onChange={(e) => setEditingRoleName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUpdateRole();
                            }
                          }}
                        />
                      </div>
                      <Button type="button" size="sm" loading={savingRole} onClick={handleUpdateRole}>
                        {t("action.save")}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setEditingRoleId(null)}>
                        {t("action.cancel")}
                      </Button>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "8px", display: "block", fontWeight: 600 }}>Permissions</span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
                        {PERMISSIONS.map(p => (
                          <label key={`edit-${p.id}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                            <input 
                              type="checkbox" 
                              checked={editingRolePermissions.includes(p.id)} 
                              onChange={(e) => {
                                if (e.target.checked) setEditingRolePermissions([...editingRolePermissions, p.id]);
                                else setEditingRolePermissions(editingRolePermissions.filter(x => x !== p.id));
                              }} 
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>{role.name}</strong>
                      {role.permissions && role.permissions.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {role.permissions.map(pid => (
                            <span key={pid} style={{ background: "rgba(0,0,0,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                              {getPermissionLabel(pid)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {canPerform(session, ["MANAGE_ROLES"]) && (
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          icon={<Pencil size={14} />}
                          onClick={() => {
                            setEditingRoleId(role.id);
                            setEditingRoleName(role.name);
                            setEditingRolePermissions(role.permissions || []);
                          }}
                        >
                          {t("action.edit")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          icon={<Trash2 size={14} />}
                          loading={savingRole}
                          onClick={() => handleDeleteRole(role.id, role.name)}
                        >
                          {t("action.delete")}
                        </Button>
                      </div>
                    )}
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
        )}

      </div>
    </div>
  );
}
