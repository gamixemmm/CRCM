"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getTranslation, TranslationKey } from "./translations";

export type CurrencyCode = "MAD" | "EUR" | "USD";
export type LanguageCode = "en" | "fr" | "ar";

interface SettingsContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amount: number) => string;
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  formatStatusT: (status: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("MAD");
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("crms_currency") as CurrencyCode;
    if (stored && ["MAD", "EUR", "USD"].includes(stored)) {
      setCurrencyState(stored);
    }
    const storedLang = localStorage.getItem("crms_language") as LanguageCode;
    if (storedLang && ["en", "fr", "ar"].includes(storedLang)) {
      setLanguageState(storedLang);
    }
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem("crms_currency", c);
  };

  const setLanguage = (l: LanguageCode) => {
    setLanguageState(l);
    localStorage.setItem("crms_language", l);
  };

  const t = (key: TranslationKey): string => {
    const activeLang = mounted ? language : "en";
    return getTranslation(key, activeLang);
  };

  const statusKeyMap: Record<string, TranslationKey> = {
    AVAILABLE: "status.available",
    RENTED: "status.rented",
    MAINTENANCE: "status.maintenance",
    OUT_OF_SERVICE: "status.outOfService",
    PENDING: "status.pending",
    CONFIRMED: "status.confirmed",
    ACTIVE: "status.active",
    COMPLETED: "status.completed",
    CANCELLED: "status.cancelled",
    PARTIAL: "status.partial",
    PAID: "status.paid",
    REFUNDED: "status.refunded",
    IN_MAINTENANCE: "status.inMaintenance",
    UNPAID: "status.unpaid",
  };

  const formatStatusT = (status: string): string => {
    const key = statusKeyMap[status];
    if (key) return t(key);
    // fallback: Title Case
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatPrice = (amount: number) => {
    const activeCurrency = mounted ? currency : "MAD";

    if (activeCurrency === "MAD") {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount) + " MAD";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: activeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <SettingsContext.Provider value={{ currency, setCurrency, formatPrice, language, setLanguage, t, formatStatusT }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
