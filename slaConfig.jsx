// SLA turnaround times in business days per category & priority
export const SLA_DAYS = {
  priority: {
    "Urgent": 1,
    "High": 3,
    "Medium": 7,
    "Low": 14
  }
};

export function getSLADueDate(request) {
  if (!request?.created_date) return null;
  const days = SLA_DAYS.priority[request.priority] || 7;
  const due = new Date(request.created_date);
  due.setDate(due.getDate() + days);
  return due;
}

export function getSLAStatus(request) {
  if (["Completed", "Cancelled"].includes(request.request_status)) return null;
  const due = getSLADueDate(request);
  if (!due) return null;
  const now = new Date();
  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: `Overdue by ${Math.abs(daysLeft)}d`, color: "bg-rose-100 text-rose-700", urgent: true };
  if (daysLeft === 0) return { label: "Due today", color: "bg-orange-100 text-orange-700", urgent: true };
  if (daysLeft <= 1) return { label: `Due in ${daysLeft}d`, color: "bg-orange-100 text-orange-600", urgent: true };
  if (daysLeft <= 3) return { label: `Due in ${daysLeft}d`, color: "bg-amber-100 text-amber-700", urgent: false };
  return { label: `Due in ${daysLeft}d`, color: "bg-slate-100 text-slate-500", urgent: false };
}
