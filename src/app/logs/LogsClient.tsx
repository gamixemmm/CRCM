"use client";

import { useMemo, useState } from "react";
import { Activity, Filter, Search, ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useSettings } from "@/lib/SettingsContext";
import { formatDate } from "@/lib/utils";
import styles from "./logs.module.css";

type AuditLog = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export default function LogsClient({ logs }: { logs: AuditLog[] }) {
  const { t } = useSettings();
  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("All");
  const [action, setAction] = useState("All");
  const [entityType, setEntityType] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const actors = useMemo(() => {
    const values = new Map<string, string>();
    logs.forEach((log) => {
      const key = log.actorId || log.actorEmail || "system";
      values.set(key, log.actorName || log.actorEmail || t("logs.system"));
    });
    return [["All", t("label.all")], ...Array.from(values.entries()).sort((a, b) => a[1].localeCompare(b[1]))];
  }, [logs, t]);

  const actions = useMemo(() => ["All", ...Array.from(new Set(logs.map((log) => log.action))).sort()], [logs]);
  const entityTypes = useMemo(() => ["All", ...Array.from(new Set(logs.map((log) => log.entityType).filter(Boolean) as string[])).sort()], [logs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      const actorKey = log.actorId || log.actorEmail || "system";
      const createdDate = new Date(log.createdAt).toISOString().split("T")[0];
      const matchesSearch =
        !term ||
        log.message.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        (log.actorName || "").toLowerCase().includes(term) ||
        (log.actorEmail || "").toLowerCase().includes(term) ||
        (log.entityType || "").toLowerCase().includes(term) ||
        (log.entityId || "").toLowerCase().includes(term);

      return (
        matchesSearch &&
        (actor === "All" || actorKey === actor) &&
        (action === "All" || log.action === action) &&
        (entityType === "All" || log.entityType === entityType) &&
        (!startDate || createdDate >= startDate) &&
        (!endDate || createdDate <= endDate)
      );
    });
  }, [logs, search, actor, action, entityType, startDate, endDate]);

  const columns = [
    {
      key: "createdAt",
      label: t("logs.time"),
      render: (log: AuditLog) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "actor",
      label: t("logs.user"),
      render: (log: AuditLog) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <strong>{log.actorName || log.actorEmail || t("logs.system")}</strong>
          <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>{log.actorRole || "-"}</span>
        </div>
      ),
    },
    {
      key: "action",
      label: t("logs.action"),
      render: (log: AuditLog) => <Badge variant="info">{log.action}</Badge>,
    },
    {
      key: "entity",
      label: t("logs.entity"),
      render: (log: AuditLog) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <strong>{log.entityType || "-"}</strong>
          <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>{log.entityId || ""}</span>
        </div>
      ),
    },
    {
      key: "message",
      label: t("logs.message"),
      render: (log: AuditLog) => <span>{log.message}</span>,
    },
  ];

  const mobileCards = filteredLogs.map((log) => (
    <Card key={log.id} hover padding="md" className={styles.mobileCard}>
      <div className={styles.mobileCardTop}>
        <div className={styles.mobileTopText}>
          <div className={styles.mobileAction}>
            <Activity size={14} />
            <span>{log.action}</span>
          </div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {log.entityType || t("logs.entity")}
          </div>
        </div>
        <Badge variant="info">{formatDate(log.createdAt)}</Badge>
      </div>

      <div className={styles.mobileMetaGrid}>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("logs.user")}</span>
          <span className={styles.mobileMetaValue}>{log.actorName || log.actorEmail || t("logs.system")}</span>
        </div>
        <div className={styles.mobileMetaItem}>
          <span className={styles.mobileMetaLabel}>{t("logs.entity")}</span>
          <span className={styles.mobileMetaValue}>{log.entityId || "-"}</span>
        </div>
      </div>

      <div className={styles.mobileMessage}>{log.message}</div>

      <div className={styles.mobileFooter}>
        <div style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
          {log.actorRole || t("logs.system")}
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
      </div>
    </Card>
  ));

  return (
    <div className="animate-fade-in">
      <div className={`page-header ${styles.pageHeader}`}>
        <h1>
          <Activity size={24} />
          {t("logs.title")}
        </h1>
      </div>

      <Card padding="md" className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <Input label={t("action.search")} icon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("logs.searchPlaceholder")} />
          <Select label={t("logs.user")} icon={<Filter size={16} />} value={actor} onChange={(e) => setActor(e.target.value)}>
            {actors.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select label={t("logs.action")} value={action} onChange={(e) => setAction(e.target.value)}>
            {actions.map((value) => <option key={value} value={value}>{value === "All" ? t("label.all") : value}</option>)}
          </Select>
          <Select label={t("logs.entity")} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            {entityTypes.map((value) => <option key={value} value={value}>{value === "All" ? t("label.all") : value}</option>)}
          </Select>
          <Input label={t("logs.from")} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label={t("logs.to")} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setActor("All");
              setAction("All");
              setEntityType("All");
              setStartDate("");
              setEndDate("");
            }}
          >
            {t("calendar.clear")}
          </Button>
        </div>
      </Card>

      <div className={styles.desktopTable}>
        <Table columns={columns} data={filteredLogs} keyExtractor={(log) => log.id} emptyMessage={t("logs.empty")} />
      </div>

      <div className={styles.mobileList}>
        {mobileCards}
        {filteredLogs.length === 0 && (
          <div className={`empty-state ${styles.mobileEmpty}`}>
            <Activity size={44} />
            <h3>{t("logs.empty")}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
