"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Car, CheckCircle2, Edit3, Search, WalletCards } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/SettingsContext";
import type { TranslationKey } from "@/lib/translations";
import { saveCarInstallmentPayment, updateCarInstallmentMonthlyStatus } from "@/actions/carInstallments";
import styles from "./car-installments.module.css";

type InstallmentPayment = {
  id: string;
  monthlyPaidAmount: number;
  monthlyPaymentStatus: "NOT_DONE" | "DONE" | "SKIPPED";
  monthlyPaymentMonth: number | null;
  monthlyPaymentYear: number | null;
  updatedAt: string;
};

type VehicleRow = {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  year: number;
  installmentPayment: InstallmentPayment | null;
};

function getCurrentMonthMarker() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function getMonthlyStatus(payment: InstallmentPayment | null) {
  if (!payment) return "NOT_DONE" as const;
  const { month, year } = getCurrentMonthMarker();
  if (payment.monthlyPaymentMonth !== month || payment.monthlyPaymentYear !== year) {
    return "NOT_DONE" as const;
  }
  return payment.monthlyPaymentStatus;
}

export default function CarInstallmentsClient({ vehicles, canAddCarPayments }: { vehicles: VehicleRow[]; canAddCarPayments: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t, formatPrice } = useSettings();
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRow | null>(null);
  const [monthlyPaidAmount, setMonthlyPaidAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    return vehicles.reduce(
      (acc, vehicle) => {
        const payment = vehicle.installmentPayment;
        acc.totalVehicles += 1;
        if (!payment) {
          acc.notSet += 1;
          return acc;
        }

        acc.configured += 1;
        acc.totalMonthly += payment.monthlyPaidAmount;
        const status = getMonthlyStatus(payment);
        if (status === "DONE") {
          acc.thisMonthDone += 1;
          acc.thisMonthPaidAmount += payment.monthlyPaidAmount;
        }
        else {
          acc.thisMonthPending += 1;
          acc.thisMonthLeftToPay += payment.monthlyPaidAmount;
        }
        return acc;
      },
      { totalVehicles: 0, configured: 0, notSet: 0, totalMonthly: 0, thisMonthDone: 0, thisMonthPending: 0, thisMonthLeftToPay: 0, thisMonthPaidAmount: 0 }
    );
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((vehicle) =>
      `${vehicle.brand} ${vehicle.model} ${vehicle.plateNumber}`.toLowerCase().includes(term)
    );
  }, [vehicles, search]);

  const openPaymentModal = (vehicle: VehicleRow) => {
    if (!canAddCarPayments) return;
    setSelectedVehicle(vehicle);
    setMonthlyPaidAmount(vehicle.installmentPayment ? String(vehicle.installmentPayment.monthlyPaidAmount) : "");
  };

  const handleSave = async () => {
    if (!selectedVehicle) return;

    const parsedMonthly = Number(monthlyPaidAmount);
    if (!Number.isFinite(parsedMonthly) || parsedMonthly < 0) {
      toast(t("carInstallments.invalidMonthlyAmount"), "error");
      return;
    }

    setLoading(true);
    const result = await saveCarInstallmentPayment({
      vehicleId: selectedVehicle.id,
      monthlyPaidAmount: parsedMonthly,
    });
    setLoading(false);

    if (result.success) {
      toast(t((result.messageKey ?? "carInstallments.saved") as TranslationKey), "success");
      setSelectedVehicle(null);
      router.refresh();
    } else {
      toast(t((result.messageKey ?? "carInstallments.saveFailed") as TranslationKey), "error");
    }
  };

  const renderMonthlyStatus = (vehicle: VehicleRow) => {
    const status = getMonthlyStatus(vehicle.installmentPayment);
    if (status === "DONE") {
      return <Badge variant="success" icon={<CheckCircle2 size={12} />}>{t("carInstallments.thisMonthPaid")}</Badge>;
    }
    if (status === "SKIPPED") {
      return <Badge variant="warning">{t("carInstallments.thisMonthSkipped")}</Badge>;
    }
    return <Badge variant="default">{t("carInstallments.thisMonthNotDone")}</Badge>;
  };

  const handleMarkMonthPaid = async (vehicle: VehicleRow) => {
    const result = await updateCarInstallmentMonthlyStatus({
      vehicleId: vehicle.id,
      status: "DONE",
    });

    if (result.success) {
      toast(t((result.messageKey ?? "carInstallments.paymentRecorded") as TranslationKey), "success");
      router.refresh();
    } else {
      toast(t((result.messageKey ?? "carInstallments.updateMonthlyFailed") as TranslationKey), "error");
    }
  };

  const handleSkipMonth = async (vehicle: VehicleRow) => {
    const result = await updateCarInstallmentMonthlyStatus({ vehicleId: vehicle.id, status: "SKIPPED" });
    if (result.success) {
      toast(t((result.messageKey ?? "carInstallments.monthSkipped") as TranslationKey), "success");
      router.refresh();
    } else {
      toast(t((result.messageKey ?? "carInstallments.updateMonthlyFailed") as TranslationKey), "error");
    }
  };

  const handleMarkMonthUnpaid = async (vehicle: VehicleRow) => {
    const result = await updateCarInstallmentMonthlyStatus({ vehicleId: vehicle.id, status: "NOT_DONE" });
    if (result.success) {
      toast(t((result.messageKey ?? "carInstallments.monthMarkedUnpaid") as TranslationKey), "success");
      router.refresh();
    } else {
      toast(t((result.messageKey ?? "carInstallments.updateMonthlyFailed") as TranslationKey), "error");
    }
  };

  const columns = [
    {
      key: "vehicle",
      label: t("carInstallments.car"),
      render: (vehicle: VehicleRow) => (
        <div className={styles.vehicleCell}>
          <div className={styles.vehicleIcon}>
            <Car size={20} />
          </div>
          <div className={styles.vehicleText}>
            <strong>{vehicle.brand} {vehicle.model}</strong>
            <span>{vehicle.year} | {vehicle.plateNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: "monthlyPaidAmount",
      label: t("carInstallments.monthly"),
      render: (vehicle: VehicleRow) => vehicle.installmentPayment ? formatPrice(vehicle.installmentPayment.monthlyPaidAmount) : "-",
    },
    {
      key: "monthlyStatus",
      label: t("carInstallments.thisMonth"),
      render: renderMonthlyStatus,
    },
    {
      key: "actions",
      label: t("label.actions"),
      align: "right" as const,
      render: (vehicle: VehicleRow) => (
        <div className={styles.actionGroup}>
          {canAddCarPayments && (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<Edit3 size={14} />}
                onClick={() => openPaymentModal(vehicle)}
              >
                {vehicle.installmentPayment ? t("action.edit") : t("carInstallments.submit")}
              </Button>
              {vehicle.installmentPayment && (
                getMonthlyStatus(vehicle.installmentPayment) === "NOT_DONE" ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="success"
                      onClick={() => handleMarkMonthPaid(vehicle)}
                    >
                      {t("status.paid")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSkipMonth(vehicle)}
                    >
                      {t("carInstallments.skipMonth")}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkMonthUnpaid(vehicle)}
                  >
                    {t("status.unpaid")}
                  </Button>
                )
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  const mobileCards = filteredVehicles.map((vehicle) => {
    const payment = vehicle.installmentPayment;

    return (
      <Card key={vehicle.id} padding="md" className={styles.mobileCard} hover={canAddCarPayments} onClick={() => openPaymentModal(vehicle)}>
          <div className={styles.mobileTop}>
            <div className={styles.vehicleText}>
              <strong>{vehicle.brand} {vehicle.model}</strong>
              <span>{vehicle.year} | {vehicle.plateNumber}</span>
            </div>
          <div className={styles.mobileStatusStack}>
            {renderMonthlyStatus(vehicle)}
          </div>
          </div>

        {payment ? (
          <>
            <div className={styles.mobileMetaGrid}>
              <div>
                <span>{t("carInstallments.monthly")}</span>
                <strong>{formatPrice(payment.monthlyPaidAmount)}</strong>
              </div>
            </div>
            {canAddCarPayments && getMonthlyStatus(payment) === "NOT_DONE" ? (
              <div className={styles.mobileActionRow}>
                <Button type="button" size="sm" variant="success" onClick={(e) => { e.stopPropagation(); handleMarkMonthPaid(vehicle); }}>
                  {t("status.paid")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleSkipMonth(vehicle); }}>
                  {t("carInstallments.skipMonth")}
                </Button>
              </div>
            ) : canAddCarPayments ? (
              <div className={styles.mobileActionRow}>
                <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleMarkMonthUnpaid(vehicle); }}>
                  {t("status.unpaid")}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.emptyPayment}>{t("carInstallments.emptyPayment")}</div>
        )}
      </Card>
    );
  });

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      <div className="page-header">
        <h1>
          <WalletCards size={24} />
          {t("carInstallments.title")}
        </h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>{t("carInstallments.totalCars")}</span>
          <strong>{stats.totalVehicles}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.thisMonthPaidAmount")}</span>
          <strong>{formatPrice(stats.thisMonthPaidAmount)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.paidMonthly")}</span>
          <strong>{formatPrice(stats.totalMonthly)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.thisMonthPaid")}</span>
          <strong>{stats.thisMonthDone}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.thisMonthLeftToPay")}</span>
          <strong>{formatPrice(stats.thisMonthLeftToPay)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.thisMonthNotDone")}</span>
          <strong>{stats.thisMonthPending}</strong>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("carInstallments.searchPlaceholder")}
            className={styles.searchInput}
          />
        </div>
        <Badge variant="default">{stats.notSet} {t("carInstallments.withoutPaymentInfo")}</Badge>
      </div>

      <div className={styles.desktopTable}>
        <Table
          columns={columns}
          data={filteredVehicles}
          keyExtractor={(vehicle) => vehicle.id}
          emptyMessage={t("vehicles.noVehicles")}
        />
      </div>

      <div className={styles.mobileList}>
        {mobileCards}
        {filteredVehicles.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <Banknote size={44} />
            <h3>{t("vehicles.noVehicles")}</h3>
          </div>
        )}
      </div>

      <Modal
        isOpen={canAddCarPayments && !!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        title={t("carInstallments.paymentInfoTitle")}
        size="sm"
      >
        <div className={styles.modalForm}>
          <p className={styles.modalIntro}>
            <strong>{selectedVehicle?.brand} {selectedVehicle?.model}</strong>
            <span>{selectedVehicle?.plateNumber}</span>
          </p>

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t("carInstallments.monthlyQuestion")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyPaidAmount}
              onChange={(event) => setMonthlyPaidAmount(event.target.value)}
              className={styles.modalInput}
              placeholder={t("carInstallments.monthlyPayment")}
            />
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="ghost" onClick={() => setSelectedVehicle(null)}>
              {t("action.cancel")}
            </Button>
            <Button type="button" loading={loading} onClick={handleSave}>
              {t("action.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
