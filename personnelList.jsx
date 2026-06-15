export const PERSONNEL = [
  // Admin
  { name: "Samson G. Capinig", email: "samson.capinig001@deped.gov.ph", role: "admin" },
  // Approvers
  { name: "Marcelino E. Ibanez", email: "marcelino.ibanez01@deped.gov.ph", role: "approver" },
  { name: "Gregorio Legal", email: "gregorio.legal001@deped.gov.ph", role: "approver" },
  // Assignees
  { name: "Liz R. Liao", email: "liz.liao001@deped.gov.ph", role: "assignee" },
  { name: "Dinah Dawn Serra", email: "dinahdawn.serra@deped.gov.ph", role: "assignee" },
  { name: "Rose Ann O. Narido", email: "roseann.narido@deped.gov.ph", role: "assignee" },
  { name: "Jason S. Barrun", email: "jason.barrun@deped.gov.ph", role: "assignee" },
  { name: "Atty. Remy Joyce Biñas", email: "emyjoyce.vinas@deped.gov.ph", role: "assignee" },
  { name: "Kenneth A. Lim", email: "kenneth.lim@deped.gov.ph", role: "assignee" },
  { name: "Gerard Leomel R. Estoquia", email: "gerardleomel.estoquia@deped.gov.ph", role: "assignee" },
  { name: "Ana Ferrer", email: "ana.ferrer@deped.gov.ph", role: "assignee" },
  { name: "Sandra Matados", email: "sandra.matados001@deped.gov.ph", role: "assignee" },
];

export const ADMIN_EMAILS = [
  "samson.capinig001@deped.gov.ph",
];

export const APPROVER_EMAILS = [
  "marcelino.ibanez01@deped.gov.ph",
  "gregorio.legal001@deped.gov.ph",
];

// Role hierarchy:
// - admin: full access (view all, edit status, assign, delete)
// - approver: can update request status and approve requests
// - assignee: can view assigned requests, accept/reassign tasks
// - requester: can submit requests and view own requests only

export function isAdminUser(user) {
  if (!user) return false;
  return user.role === "admin" || ADMIN_EMAILS.includes(user.email);
}

export function isApprover(user) {
  if (!user) return false;
  return isAdminUser(user) || user.role === "approver" || APPROVER_EMAILS.includes(user.email);
}

export function isAssignee(user) {
  if (!user) return false;
  return isAdminUser(user) || user.role === "assignee" || user.role === "approver";
}

export function canUpdateStatus(user) {
  // Admin, approver, and assignee can update request status
  return isApprover(user) || isAssignee(user);
}

export function canManageAssignments(user) {
  // Admin can manage assignments
  return isAdminUser(user);
}

export function canViewAllRequests(user) {
  // Admin, approver, and assignee can view all requests
  return isAdminUser(user) || user?.role === "approver" || user?.role === "assignee";
}
