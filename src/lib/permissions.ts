export const PERMISSIONS = [
  { id: "VIEW_OVERALL_REVENUE", label: "View Overall Revenue" },
  { id: "VIEW_PENDING_REVENUE", label: "View Pending Payments" },
  { id: "VIEW_DASHBOARD_FINANCIALS", label: "View Dashboard Revenue Due and Remainder" },
  { id: "VIEW_VEHICLES", label: "View Vehicles" },
  { id: "ADD_VEHICLES", label: "Add Vehicles" },
  { id: "MANAGE_VEHICLES", label: "View and Manage Vehicles" },
  { id: "VIEW_BOOKINGS", label: "View Bookings" },
  { id: "ADD_BOOKINGS", label: "Create Bookings" },
  { id: "MANAGE_BOOKINGS", label: "View and Manage Bookings" },
  { id: "VIEW_CALENDAR", label: "View Calendar" },
  { id: "VIEW_BROKERS", label: "View Brokers" },
  { id: "ADD_BROKERS", label: "Add Brokers" },
  { id: "MANAGE_BROKERS", label: "View and Manage Brokers" },
  { id: "VIEW_ALL_INVOICES", label: "View All Invoices" },
  { id: "VIEW_UNPAID_INVOICES", label: "View Pending or Partial Invoices Only" },
  { id: "PAY_INVOICES", label: "Pay Invoices" },
  { id: "DELETE_INVOICES", label: "Delete Invoices" },
  { id: "MANAGE_INVOICES", label: "View and Manage Invoices" },
  { id: "VIEW_CAR_PAYMENTS", label: "View Car Payments" },
  { id: "ADD_CAR_PAYMENTS", label: "Add Car Payments" },
  { id: "VIEW_EXPENSES", label: "View Expenses" },
  { id: "ADD_EXPENSE_PAYMENTS", label: "Add Expense Payments" },
  { id: "EDIT_DELETE_EXPENSES", label: "Edit or Delete Expenses" },
  { id: "MANAGE_EXPENSES", label: "View and Manage Expenses" },
  { id: "VIEW_VIGNETTE", label: "View Vignette" },
  { id: "MANAGE_VIGNETTE", label: "View and Manage Vignette" },
  { id: "VIEW_INSURANCE", label: "View Insurance" },
  { id: "MANAGE_INSURANCE", label: "View and Manage Insurance" },
  { id: "VIEW_TECHNICAL_INSPECTION", label: "View Technical Inspection" },
  { id: "MANAGE_TECHNICAL_INSPECTION", label: "View and Manage Technical Inspection" },
  { id: "VIEW_EMPLOYEES", label: "View Employees" },
  { id: "ADD_EMPLOYEES", label: "Add Employees" },
  { id: "MANAGE_EMPLOYEES", label: "View and Manage Employees" },
  { id: "VIEW_MAINTENANCE", label: "View Maintenance" },
  { id: "CREATE_MAINTENANCE", label: "Create Maintenance" },
  { id: "MANAGE_MAINTENANCE", label: "View and Manage Maintenance" },
  { id: "ADD_ROLES", label: "Add Roles" },
  { id: "VIEW_ROLES", label: "View Roles" },
  { id: "MANAGE_ROLES", label: "View and Manage Roles" },
  { id: "EXPORT_DATA", label: "Extract Company Data" },
];

const PERMISSION_ALIASES: Record<string, string> = {
  VIEW_CUSTOMERS: "VIEW_BROKERS",
  MANAGE_CUSTOMERS: "MANAGE_BROKERS",
  VIEW_INVOICES: "VIEW_ALL_INVOICES",
  ADD_INVOICE_PAYMENTS: "PAY_INVOICES",
};

const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
  ADD_VEHICLES: ["VIEW_VEHICLES"],
  MANAGE_VEHICLES: ["ADD_VEHICLES", "VIEW_VEHICLES"],
  ADD_BOOKINGS: ["VIEW_BOOKINGS"],
  MANAGE_BOOKINGS: ["ADD_BOOKINGS", "VIEW_BOOKINGS", "VIEW_CALENDAR"],
  ADD_BROKERS: ["VIEW_BROKERS"],
  MANAGE_BROKERS: ["ADD_BROKERS", "VIEW_BROKERS"],
  PAY_INVOICES: ["VIEW_UNPAID_INVOICES"],
  DELETE_INVOICES: ["VIEW_ALL_INVOICES"],
  MANAGE_INVOICES: ["PAY_INVOICES", "DELETE_INVOICES", "VIEW_ALL_INVOICES", "VIEW_UNPAID_INVOICES"],
  ADD_CAR_PAYMENTS: ["VIEW_CAR_PAYMENTS"],
  ADD_EXPENSE_PAYMENTS: ["VIEW_EXPENSES"],
  MANAGE_EXPENSES: ["ADD_EXPENSE_PAYMENTS", "VIEW_EXPENSES"],
  MANAGE_VIGNETTE: ["VIEW_VIGNETTE"],
  MANAGE_INSURANCE: ["VIEW_INSURANCE"],
  MANAGE_TECHNICAL_INSPECTION: ["VIEW_TECHNICAL_INSPECTION"],
  ADD_EMPLOYEES: ["VIEW_EMPLOYEES"],
  MANAGE_EMPLOYEES: ["ADD_EMPLOYEES", "VIEW_EMPLOYEES"],
  CREATE_MAINTENANCE: ["VIEW_MAINTENANCE"],
  MANAGE_MAINTENANCE: ["CREATE_MAINTENANCE", "VIEW_MAINTENANCE"],
  ADD_ROLES: ["VIEW_ROLES"],
  MANAGE_ROLES: ["ADD_ROLES", "VIEW_ROLES"],
};

function canonicalizePermission(permission: string) {
  return PERMISSION_ALIASES[permission] || permission;
}

function expandPermissions(permissions: string[]) {
  const expanded = new Set<string>();
  const stack = permissions.map(canonicalizePermission);

  while (stack.length > 0) {
    const permission = stack.pop();
    if (!permission || expanded.has(permission)) continue;
    expanded.add(permission);

    const implied = PERMISSION_IMPLICATIONS[permission];
    if (implied) {
      for (const next of implied) {
        stack.push(canonicalizePermission(next));
      }
    }
  }

  return expanded;
}

export function hasPermission(session: { permissions?: string[] } | null, permission: string): boolean {
  if (!session) return false;
  if (!session.permissions) return false;
  if (session.permissions.includes("*")) return true;

  const normalizedPermission = canonicalizePermission(permission);
  const expandedPermissions = expandPermissions(session.permissions);
  return expandedPermissions.has(normalizedPermission);
}

export function hasAnyPermission(session: { permissions?: string[] } | null, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(session, permission));
}

export function canPerform(session: { role?: string; permissions?: string[] } | null, permissions: string[]): boolean {
  if (!session) return false;
  if (session.role === "Administrator") return true;
  return hasAnyPermission(session, permissions);
}

export function getPermissionLabel(permissionId: string) {
  const canonicalPermission = canonicalizePermission(permissionId);
  return PERMISSIONS.find((permission) => permission.id === canonicalPermission)?.label || permissionId;
}
