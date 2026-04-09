import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { SettingsProvider } from "@/lib/SettingsContext";

export const metadata: Metadata = {
  title: "CRMS — Car Rental Management System",
  description: "Modern car rental fleet management, bookings, and billing system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

