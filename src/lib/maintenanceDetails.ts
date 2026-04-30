import type { TranslationKey } from "@/lib/translations";

const DETAIL_PREFIX = "detail";
const COST_PREFIX = "cost";

type MaintenanceTranslator = (key: TranslationKey) => string;

const MAINTENANCE_VALUE_KEYS: Record<string, TranslationKey> = {
  "Vidange": "maintenance.value.oilChange",
  "Changement des pneus": "maintenance.value.tireChange",
  "Plaquettes de frein (avant / arrière)": "maintenance.value.brakePads",
  "Disques de frein": "maintenance.value.brakeDiscs",
  "Équilibrage & parallélisme": "maintenance.value.alignment",
  "Réparation après accident": "maintenance.value.accidentRepair",
  "Autre": "maintenance.value.other",
  "Filtres changés": "maintenance.value.changedFilters",
  "Pneus changés": "maintenance.value.changedTires",
  "Roues concernées": "maintenance.value.affectedWheels",
  "Disques changés": "maintenance.value.changedDiscs",
  "Éléments à réparer": "maintenance.value.itemsToRepair",
  "Filtre à huile": "maintenance.value.oilFilter",
  "Filtre diesel": "maintenance.value.dieselFilter",
  "Filtre à air": "maintenance.value.airFilter",
  "Filtre habitacle": "maintenance.value.cabinFilter",
  "Pneu avant gauche": "maintenance.value.frontLeftTire",
  "Pneu avant droit": "maintenance.value.frontRightTire",
  "Pneu arrière gauche": "maintenance.value.rearLeftTire",
  "Pneu arrière droit": "maintenance.value.rearRightTire",
  "Roue avant gauche": "maintenance.value.frontLeftWheel",
  "Roue avant droite": "maintenance.value.frontRightWheel",
  "Roue arrière gauche": "maintenance.value.rearLeftWheel",
  "Roue arrière droite": "maintenance.value.rearRightWheel",
  "Disque avant gauche": "maintenance.value.frontLeftDisc",
  "Disque avant droit": "maintenance.value.frontRightDisc",
  "Disque arrière gauche": "maintenance.value.rearLeftDisc",
  "Disque arrière droit": "maintenance.value.rearRightDisc",
  "Pare-chocs avant": "maintenance.value.frontBumper",
  "Pare-chocs arrière": "maintenance.value.rearBumper",
  "Aile avant gauche": "maintenance.value.frontLeftFender",
  "Aile avant droite": "maintenance.value.frontRightFender",
  "Aile arrière gauche": "maintenance.value.rearLeftFender",
  "Aile arrière droite": "maintenance.value.rearRightFender",
  "Capot": "maintenance.value.hood",
  "Coffre": "maintenance.value.trunk",
  "Portière gauche": "maintenance.value.leftDoor",
  "Portière droite": "maintenance.value.rightDoor",
  "Phare avant": "maintenance.value.headlight",
  "Feu arrière": "maintenance.value.tailLight",
  "Rétroviseur": "maintenance.value.mirror",
  "Pare-brise": "maintenance.value.windshield",
  "Radiateur": "maintenance.value.radiator",
  "Suspension": "maintenance.value.suspension",
  "Jante": "maintenance.value.rim",
  "Peinture": "maintenance.value.paint",
};

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

export function translateMaintenanceValue(value: string, translate: MaintenanceTranslator) {
  const key = MAINTENANCE_VALUE_KEYS[value];
  if (key) return translate(key);

  if (value.startsWith("Autre - ")) {
    return `${translate("maintenance.value.other")} - ${value.slice("Autre - ".length)}`;
  }

  return value;
}

export function translateMaintenanceText(text: string, translate: MaintenanceTranslator) {
  return text
    .split(",")
    .map((part) => translateMaintenanceValue(part.trim(), translate))
    .join(", ");
}

export function formatMaintenanceEntries(entries: string[] = [], currency = "", translate?: MaintenanceTranslator) {
  const groups = parseMaintenanceDetails(entries);
  return groups
    .map((group) => {
      const cost = group.cost ? ` (${group.cost} ${currency})` : "";
      const intervention = translate ? translateMaintenanceValue(group.intervention, translate) : group.intervention;
      const items = group.items.length
        ? `: ${group.items.map((item) => (translate ? translateMaintenanceValue(item, translate) : item)).join(", ")}`
        : "";
      return `${intervention}${cost}${items}`;
    })
    .join(" | ");
}
