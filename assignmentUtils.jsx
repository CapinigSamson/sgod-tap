import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

/**
 * Auto-assign a TA request based on category/keyword rules.
 * Returns the matched CategoryAssignment record or null.
 */
export async function autoAssignRequest(request) {
  const rules = await base44.entities.CategoryAssignment.filter({ is_active: true });
  if (!rules.length) return null;

  // 1. Try keyword match first
  const textToSearch = `${request.concerns} ${request.ta_needed}`.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords) {
      const kws = rule.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
      if (kws.some(kw => textToSearch.includes(kw))) {
        return rule;
      }
    }
  }

  // 2. Fall back to category match
  return rules.find(r => r.category === request.category) || null;
}

/**
 * Assign a request to a personnel record, update the entity, and send notification.
 */
export async function assignRequest(requestId, requestNumber, rule) {
  await base44.entities.TARequest.update(requestId, {
    assigned_to_email: rule.assigned_to_email,
    assigned_to_name: rule.assigned_to_name,
    assignment_status: "Pending Acceptance",
    assigned_at: new Date().toISOString()
  });

  await base44.entities.Notification.create({
    recipient_email: rule.assigned_to_email,
    title: `New Assignment: ${requestNumber}`,
    message: `You have been assigned a Technical Assistance request (${requestNumber}). Please review and accept or reassign.`,
    type: "new_request",
    reference_id: requestId,
    is_read: false,
    link: createPageUrl(`RequestDetail?id=${requestId}`)
  });
}
