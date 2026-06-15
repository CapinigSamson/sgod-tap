import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { UserCheck, UserX, RefreshCw, Loader2, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERSONNEL, isAdminUser, isApprover } from "@/components/assignment/personnelList";

const assignmentStatusColors = {
  "Unassigned": "bg-slate-100 text-slate-500",
  "Pending Acceptance": "bg-amber-100 text-amber-700",
  "Accepted": "bg-emerald-100 text-emerald-700",
  "Reassigned": "bg-blue-100 text-blue-700"
};

export default function AssignmentPanel({ request, user, onUpdate }) {
  const [accepting, setAccepting] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignEmail, setReassignEmail] = useState("");
  const [reassignName, setReassignName] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const isAssignedToMe = request.assigned_to_email === user?.email;
  const isAdmin = isAdminUser(user);
  const isApproverUser = isApprover(user);

  const handlePersonnelSelect = (value) => {
    if (value === "__custom__") {
      setShowCustomInput(true);
      setReassignEmail("");
      setReassignName("");
    } else {
      setShowCustomInput(false);
      const person = PERSONNEL.find(p => p.email === value);
      if (person) {
        setReassignEmail(person.email);
        setReassignName(person.name);
      }
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    await base44.entities.TARequest.update(request.id, {
      assignment_status: "Accepted",
      accepted_at: new Date().toISOString(),
      request_status: "Acknowledged"
    });

    // Notify requester
    if (request.created_by) {
      await base44.entities.Notification.create({
        recipient_email: request.created_by,
        title: `Request ${request.request_number} Accepted`,
        message: `${request.assigned_to_name} has accepted your TA request and will be assisting you.`,
        type: "status_update",
        reference_id: request.id,
        is_read: false,
        link: createPageUrl(`RequestDetail?id=${request.id}`)
      });
    }

    onUpdate({ assignment_status: "Accepted", accepted_at: new Date().toISOString(), request_status: "Acknowledged" });
    setAccepting(false);
  };

  const handleReassign = async () => {
    if (!reassignEmail || !reassignName) return;
    setReassigning(true);

    await base44.entities.TARequest.update(request.id, {
      assigned_to_email: reassignEmail,
      assigned_to_name: reassignName,
      assignment_status: "Pending Acceptance",
      assigned_at: new Date().toISOString(),
      reassign_reason: reassignReason,
      accepted_at: null
    });

    // Notify new assignee
    await base44.entities.Notification.create({
      recipient_email: reassignEmail,
      title: `Reassigned: ${request.request_number}`,
      message: `A TA request has been reassigned to you by ${user?.full_name || "SDO staff"}. ${reassignReason ? `Reason: ${reassignReason}` : ""}`,
      type: "new_request",
      reference_id: request.id,
      is_read: false,
      link: createPageUrl(`RequestDetail?id=${request.id}`)
    });

    // Notify admins
    const admins = await base44.entities.User.filter({ role: "admin" });
    for (const admin of admins) {
      if (admin.email !== user?.email) {
        await base44.entities.Notification.create({
          recipient_email: admin.email,
          title: `Request ${request.request_number} Reassigned`,
          message: `${request.assigned_to_name} reassigned to ${reassignName}.`,
          type: "status_update",
          reference_id: request.id,
          is_read: false,
          link: createPageUrl(`RequestDetail?id=${request.id}`)
        });
      }
    }

    onUpdate({
      assigned_to_email: reassignEmail,
      assigned_to_name: reassignName,
      assignment_status: "Pending Acceptance",
      reassign_reason: reassignReason
    });
    setShowReassign(false);
    setReassignEmail("");
    setReassignName("");
    setReassignReason("");
    setReassigning(false);
  };

  // Admin manual reassign UI (same form)
  const canReassign = isAssignedToMe || isAdmin || isApproverUser;
  const canAccept = isAssignedToMe && request.assignment_status === "Pending Acceptance";

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Assignment</h3>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <User2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {request.assigned_to_name || <span className="text-slate-400 italic">Unassigned</span>}
            </p>
            {request.assigned_to_email && (
              <p className="text-xs text-slate-400">{request.assigned_to_email}</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${assignmentStatusColors[request.assignment_status || "Unassigned"]}`}>
          {request.assignment_status || "Unassigned"}
        </span>
      </div>

      {request.reassign_reason && (
        <p className="text-xs text-slate-400 mb-3 bg-slate-50 rounded-lg px-3 py-2">
          <strong>Reassign reason:</strong> {request.reassign_reason}
        </p>
      )}

      {/* Action Buttons */}
      {!showReassign && (
        <div className="flex gap-2 flex-wrap">
          {canAccept && (
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={accepting}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-1"
            >
              {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Accept Task
            </Button>
          )}
          {canReassign && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReassign(true)}
              className="rounded-xl gap-1 border-slate-200"
            >
              <RefreshCw className="w-4 h-4" /> Reassign
            </Button>
          )}
        </div>
      )}

      {/* Reassign Form */}
      {showReassign && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div>
            <Label className="text-xs text-slate-400">Select Personnel</Label>
            <Select value={reassignEmail} onValueChange={handlePersonnelSelect}>
              <SelectTrigger className="mt-1 rounded-xl border-slate-200 text-sm">
                <SelectValue placeholder="Choose personnel..." />
              </SelectTrigger>
              <SelectContent>
                {PERSONNEL.map(p => (
                  <SelectItem key={p.email} value={p.email}>
                    <div>
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.email}</div>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">
                  <div className="font-medium text-sm text-indigo-600">+ Add someone not listed</div>
                </SelectItem>
              </SelectContent>
            </Select>
            {showCustomInput && (
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Full name"
                  value={reassignName}
                  onChange={e => setReassignName(e.target.value)}
                  className="rounded-xl border-slate-200 text-sm"
                />
                <Input
                  placeholder="Email address"
                  value={reassignEmail}
                  onChange={e => setReassignEmail(e.target.value)}
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
            )}
            {!showCustomInput && reassignEmail && (
              <p className="text-xs text-slate-400 mt-1 ml-1">{reassignEmail}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-slate-400">Reason (optional)</Label>
            <Textarea
              value={reassignReason}
              onChange={e => setReassignReason(e.target.value)}
              placeholder="Reason for reassignment..."
              rows={2}
              className="mt-1 rounded-xl border-slate-200 text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setShowReassign(false); setShowCustomInput(false); setReassignEmail(""); setReassignName(""); }}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleReassign}
              disabled={reassigning || !reassignEmail || !reassignName}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-1"
            >
              {reassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
              Reassign
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
