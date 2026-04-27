const DETAIL_PREFIX = "detail";
const COST_PREFIX = "cost";

export interface MaintenanceDetailGroup {
  intervention: string;
  items: string[];
  cost?: number;
}

export function makeMaintenanceDetailEntry(intervention: string, item: string) {
  return [DETAIL_PREFIX, encodeURIComponent(intervention), encodeURIComponent(item)].join("|");
}

export function makeMaintenanceCostEntry(intervention: string, cost: number) {
  return [COST_PREFIX, encodeURIComponent(intervention), String(cost)].join("|");
}

export function parseMaintenanceDetails(entries: string[] = []): MaintenanceDetailGroup[] {
  const groups = new Map<string, MaintenanceDetailGroup>();

  const getGroup = (intervention: string) => {
    const existing = groups.get(intervention);
    if (existing) return existing;

    const group: MaintenanceDetailGroup = { intervention, items: [] };
    groups.set(intervention, group);
    return group;
  };

  entries.forEach((entry) => {
    const [kind, encodedIntervention, encodedValue] = entry.split("|");

    if ((kind === DETAIL_PREFIX || kind === COST_PREFIX) && encodedIntervention && encodedValue) {
      const intervention = decodeURIComponent(encodedIntervention);
      const group = getGroup(intervention);

      if (kind === COST_PREFIX) {
        const cost = Number(encodedValue);
        if (Number.isFinite(cost)) group.cost = cost;
        return;
      }

      group.items.push(decodeURIComponent(encodedValue));
      return;
    }

    const separatorIndex = entry.indexOf(":");
    if (separatorIndex > -1) {
      const intervention = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (intervention && value) getGroup(intervention).items.push(value);
      return;
    }

    if (entry) getGroup("Details").items.push(entry);
  });

  return Array.from(groups.values());
}

export function formatMaintenanceEntries(entries: string[] = [], currency = "") {
  const groups = parseMaintenanceDetails(entries);
  return groups
    .map((group) => {
      const cost = group.cost ? ` (${group.cost} ${currency})` : "";
      const items = group.items.length ? `: ${group.items.join(", ")}` : "";
      return `${group.intervention}${cost}${items}`;
    })
    .join(" | ");
}
