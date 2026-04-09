"use client";

import { useSettings, CurrencyCode, LanguageCode } from "@/lib/SettingsContext";
import Card from "@/components/ui/Card";
import { Settings, DollarSign, Euro, Banknote, Globe } from "lucide-react";
import Button from "@/components/ui/Button";

export default function SettingsClient() {
  const { currency, setCurrency, language, setLanguage, t } = useSettings();

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

      </div>
    </div>
  );
}
