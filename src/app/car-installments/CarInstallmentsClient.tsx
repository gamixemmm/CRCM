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
  purchasePrice: number;
  paidAmount: number;
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

function percentage(paidAmount: number, purchasePrice: number) {
  if (purchasePrice <= 0) return 0;
  return Math.min(100, Math.round((paidAmount / purchasePrice) * 100));
}

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

function hasRemainingBalance(payment: InstallmentPayment | null) {
  if (!payment) return false;
  return payment.paidAmount < payment.purchasePrice;
}

export default function CarInstallmentsClient({ vehicles }: { vehicles: VehicleRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t, formatPrice } = useSettings();
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRow | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [monthlyPaidAmount, setMonthlyPaidAmount] = useState("");
  const [paymentVehicle, setPaymentVehicle] = useState<VehicleRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

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
        acc.totalPaid += payment.paidAmount;
        acc.totalMonthly += payment.monthlyPaidAmount;
        acc.totalRemaining += Math.max(0, payment.purchasePrice - payment.paidAmount);
        const status = getMonthlyStatus(payment);
        if (status === "DONE") acc.thisMonthDone += 1;
        else if (status === "SKIPPED") acc.thisMonthSkipped += 1;
        else acc.thisMonthPending += 1;
        return acc;
      },
      { totalVehicles: 0, configured: 0, notSet: 0, totalPaid: 0, totalMonthly: 0, totalRemaining: 0, thisMonthDone: 0, thisMonthSkipped: 0, thisMonthPending: 0 }
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
    setSelectedVehicle(vehicle);
    setPurchasePrice(vehicle.installmentPayment ? String(vehicle.installmentPayment.purchasePrice) : "");
    setPaidAmount(vehicle.installmentPayment ? String(vehicle.installmentPayment.paidAmount) : "");
    setMonthlyPaidAmount(vehicle.installmentPayment ? String(vehicle.installmentPayment.monthlyPaidAmount) : "");
  };

  const openMakePaymentModal = (vehicle: VehicleRow) => {
    const payment = vehicle.installmentPayment;
    if (!payment) return;

    const remaining = Math.max(0, payment.purchasePrice - payment.paidAmount);
    const suggestedAmount = Math.min(payment.monthlyPaidAmount || remaining, remaining);
    setPaymentVehicle(vehicle);
    setPaymentAmount(suggestedAmount > 0 ? String(suggestedAmount) : "");
  };

  const handleSave = async () => {
    if (!selectedVehicle) return;

    const parsedPrice = Number(purchasePrice);
    const parsedPaid = Number(paidAmount);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast(t("carInstallments.invalidCarPrice"), "error");
      return;
    }
    if (!Number.isFinite(parsedPaid) || parsedPaid < 0) {
      toast(t("carInstallments.invalidPaidAmount"), "error");
      return;
    }
    const parsedMonthly = Number(monthlyPaidAmount);
    if (!Number.isFinite(parsedMonthly) || parsedMonthly < 0) {
      toast(t("carInstallments.invalidMonthlyAmount"), "error");
      return;
    }
    if (parsedPaid > parsedPrice) {
      toast(t("carInstallments.paidAbovePrice"), "error");
      return;
    }

    setLoading(true);
    const result = await saveCarInstallmentPayment({
      vehicleId: selectedVehicle.id,
      purchasePrice: parsedPrice,
      paidAmount: parsedPaid,
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

  const renderPaymentStatus = (vehicle: VehicleRow) => {
    const payment = vehicle.installmentPayment;
    if (!payment) {
      return <Badge variant="warning">{t("carInstallments.noPaymentInfo")}</Badge>;
    }

    if (payment.paidAmount >= payment.purchasePrice) {
      return <Badge variant="success" icon={<CheckCircle2 size={12} />}>{t("status.paid")}</Badge>;
    }

    return <Badge variant="default">{percentage(payment.paidAmount, payment.purchasePrice)}% {t("carInstallments.paidLower")}</Badge>;
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

  const handleMakePayment = async () => {
    if (!paymentVehicle?.installmentPayment) return;

    const parsedAmount = Number(paymentAmount);
    const remaining = Math.max(0, paymentVehicle.installmentPayment.purchasePrice - paymentVehicle.installmentPayment.paidAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast(t("carInstallments.enterPaymentAmount"), "error");
      return;
    }
    if (parsedAmount > remaining) {
      toast(t("carInstallments.paymentAboveRemaining"), "error");
      return;
    }

    setPaymentLoading(true);
    const result = await updateCarInstallmentMonthlyStatus({
      vehicleId: paymentVehicle.id,
      status: "DONE",
      paymentAmount: parsedAmount,
    });
    setPaymentLoading(false);

    if (result.success) {
      toast(t((result.messageKey ?? "carInstallments.paymentRecorded") as TranslationKey), "success");
      setPaymentVehicle(null);
      setPaymentAmount("");
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
      key: "purchasePrice",
      label: t("carInstallments.carPrice"),
      render: (vehicle: VehicleRow) => vehicle.installmentPayment ? formatPrice(vehicle.installmentPayment.purchasePrice) : "-",
    },
    {
      key: "paidAmount",
      label: t("carInstallments.paidSoFar"),
      render: (vehicle: VehicleRow) => vehicle.installmentPayment ? formatPrice(vehicle.installmentPayment.paidAmount) : "-",
    },
    {
      key: "monthlyPaidAmount",
      label: t("carInstallments.monthly"),
      render: (vehicle: VehicleRow) => vehicle.installmentPayment ? formatPrice(vehicle.installmentPayment.monthlyPaidAmount) : "-",
    },
    {
      key: "remaining",
      label: t("carInstallments.remaining"),
      render: (vehicle: VehicleRow) => vehicle.installmentPayment
        ? formatPrice(Math.max(0, vehicle.installmentPayment.purchasePrice - vehicle.installmentPayment.paidAmount))
        : "-",
    },
    {
      key: "status",
      label: t("label.status"),
      render: renderPaymentStatus,
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
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<Edit3 size={14} />}
            onClick={() => openPaymentModal(vehicle)}
          >
            {vehicle.installmentPayment ? t("action.edit") : t("carInstallments.submit")}
          </Button>
          {vehicle.installmentPayment && hasRemainingBalance(vehicle.installmentPayment) && (
            <>
              <Button
                type="button"
                size="sm"
                variant="success"
                onClick={() => openMakePaymentModal(vehicle)}
              >
                {t("carInstallments.makePayment")}
              </Button>
              {getMonthlyStatus(vehicle.installmentPayment) === "NOT_DONE" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSkipMonth(vehicle)}
                >
                  {t("carInstallments.skipMonth")}
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  const mobileCards = filteredVehicles.map((vehicle) => {
    const payment = vehicle.installmentPayment;
    const progress = payment ? percentage(payment.paidAmount, payment.purchasePrice) : 0;

    return (
      <Card key={vehicle.id} padding="md" className={styles.mobileCard} hover onClick={() => openPaymentModal(vehicle)}>
          <div className={styles.mobileTop}>
            <div className={styles.vehicleText}>
              <strong>{vehicle.brand} {vehicle.model}</strong>
              <span>{vehicle.year} | {vehicle.plateNumber}</span>
            </div>
          <div className={styles.mobileStatusStack}>
            {renderPaymentStatus(vehicle)}
            {renderMonthlyStatus(vehicle)}
          </div>
          </div>

        {payment ? (
          <>
            <div className={styles.progressTrack}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.mobileMetaGrid}>
              <div>
                <span>{t("carInstallments.carPrice")}</span>
                <strong>{formatPrice(payment.purchasePrice)}</strong>
              </div>
              <div>
                <span>{t("carInstallments.paidSoFar")}</span>
                <strong>{formatPrice(payment.paidAmount)}</strong>
              </div>
              <div>
                <span>{t("carInstallments.monthly")}</span>
                <strong>{formatPrice(payment.monthlyPaidAmount)}</strong>
              </div>
            </div>
            <div className={styles.mobileMetaGridSingle}>
              <div>
                <span>{t("carInstallments.remaining")}</span>
                <strong>{formatPrice(Math.max(0, payment.purchasePrice - payment.paidAmount))}</strong>
              </div>
            </div>
            {hasRemainingBalance(payment) && (
              <div className={styles.mobileActionRow}>
                <Button type="button" size="sm" variant="success" onClick={(e) => { e.stopPropagation(); openMakePaymentModal(vehicle); }}>
                  {t("carInstallments.makePayment")}
                </Button>
                {getMonthlyStatus(payment) === "NOT_DONE" && (
                  <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleSkipMonth(vehicle); }}>
                    {t("carInstallments.skipMonth")}
                  </Button>
                )}
              </div>
            )}
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
          <span>{t("carInstallments.paymentInfoSelected")}</span>
          <strong>{stats.configured}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.paidSoFar")}</span>
          <strong>{formatPrice(stats.totalPaid)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.paidMonthly")}</span>
          <strong>{formatPrice(stats.totalMonthly)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.remaining")}</span>
          <strong>{formatPrice(stats.totalRemaining)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.thisMonthPaid")}</span>
          <strong>{stats.thisMonthDone}</strong>
        </div>
        <div className={styles.statCard}>
          <span>{t("carInstallments.thisMonthSkipped")}</span>
          <strong>{stats.thisMonthSkipped}</strong>
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
        isOpen={!!selectedVehicle}
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
            <label className={styles.modalLabel}>{t("carInstallments.carPriceQuestion")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
              className={styles.modalInput}
              placeholder={t("carInstallments.carPrice")}
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t("carInstallments.paidSoFarQuestion")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
              className={styles.modalInput}
              placeholder={t("carInstallments.paidAmount")}
            />
          </div>

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

      <Modal
        isOpen={!!paymentVehicle}
        onClose={() => setPaymentVehicle(null)}
        title={t("carInstallments.makePaymentTitle")}
        size="sm"
      >
        <div className={styles.modalForm}>
          <p className={styles.modalIntro}>
            <strong>{paymentVehicle?.brand} {paymentVehicle?.model}</strong>
            <span>{paymentVehicle?.plateNumber}</span>
          </p>

          {paymentVehicle?.installmentPayment && (
            <div className={styles.paymentSummary}>
              <span>{t("carInstallments.remaining")}</span>
              <strong>{formatPrice(Math.max(0, paymentVehicle.installmentPayment.purchasePrice - paymentVehicle.installmentPayment.paidAmount))}</strong>
            </div>
          )}

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>{t("carInstallments.paymentAmountQuestion")}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              className={styles.modalInput}
              placeholder={t("carInstallments.paymentAmount")}
            />
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="ghost" onClick={() => setPaymentVehicle(null)}>
              {t("action.cancel")}
            </Button>
            <Button type="button" loading={paymentLoading} onClick={handleMakePayment}>
              {t("carInstallments.confirmPayment")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
