"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { companyAdminLogin } from "@/actions/companyAuth";
import { LanguageCode, useSettings } from "@/lib/SettingsContext";

export default function CompanyAdminLogin({
  description,
  buttonLabel,
  redirectTo,
}: {
  description?: string;
  buttonLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { language, setLanguage, t } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const languages: { value: LanguageCode; label: string }[] = [
    { value: "en", label: "English" },
    { value: "fr", label: "Francais" },
    { value: "ar", label: "Arabic" },
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const result = await companyAdminLogin({ email, password });
    setLoading(false);

    if (result.success) {
      toast(result.message, "success");
      setEmail("");
      setPassword("");
      if (redirectTo) {
        router.replace(redirectTo);
      } else {
        router.refresh();
      }
    } else {
      toast(result.message, "error");
    }
  };

  return (
    <div className="animate-fade-in" dir={language === "ar" ? "rtl" : "ltr"} style={{ maxWidth: "460px", margin: "80px auto" }}>
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "18px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "10px", background: "var(--accent-muted)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lock size={22} />
          </div>
          <div style={{ width: "156px" }}>
            <Select
              label={t("settings.language")}
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
              options={languages}
              icon={<Globe size={16} />}
            />
          </div>
        </div>
        <h1 style={{ marginBottom: "8px" }}>{t("login.title")}</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "22px", lineHeight: 1.5 }}>
          {description ?? t("login.description")}
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input label={t("login.email")} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label={t("login.password")} type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button type="submit" loading={loading} icon={<ShieldCheck size={16} />}>
            {buttonLabel ?? t("login.button")}
          </Button>
        </form>
      </div>
    </div>
  );
}
