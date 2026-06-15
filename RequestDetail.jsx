import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  ArrowLeft, MessageSquare, Clock, CheckCircle, AlertCircle, XCircle,
  Calendar, User, Briefcase, School, Loader2, Settings, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import AssignmentPanel from "@/components/assignment/AssignmentPanel";
import { isAdminUser, canUpdateStatus, canViewAllRequests } from "@/components/assignment/personnelList";
import { getSLAStatus, getSLADueDate } from "@/components/sla/slaConfig";
import { generateTAR } from "@/components/tar/generateTAR";

const statusConfig = {
  "Pending": { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  "Acknowledged": { color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
  "Scheduled": { color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Calendar },
  "In Progress": { color: "bg-violet-100 text-violet-700 border-violet-200", icon: AlertCircle },
  "Completed": { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  "Cancelled": { color: "bg-slate-100 text-slate-500 border-slate-200", icon: XCircle }
};

export default function RequestDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get("id");

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingTAR, setGeneratingTAR] = useState(false);

  const handleAssignmentUpdate = (updates) => {
    setRequest(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    loadData();
  }, [requestId]);

  const loadData = async () => {
    try {
      const [u, requests] = await Promise.all([
        base44.auth.me(),
        base44.entities.TARequest.filter({ id: requestId })
      ]);
      setUser(u);
      setRequest(requests[0]);
    } catch (e) {}
    setLoading(false);
  };

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    await base44.entities.TARequest.update(requestId, { request_status: newStatus });

    // In-app notification for every status change
    if (request?.created_by) {
      base44.entities.Notification.create({
        recipient_email: request.created_by,
        title: `Request ${request.request_number} Updated`,
        message: `Your TA request status has been updated to: ${newStatus}`,
        type: "status_update",
        reference_id: requestId,
        is_read: false,
        link: createPageUrl(`RequestDetail?id=${requestId}`)
      }).catch(() => {});
    }

    // Email notification for Completed — include feedback link
    if (newStatus === "Completed" && request?.created_by) {
      const feedbackUrl = `${window.location.origin}/FeedbackForm?id=${requestId}`;
      base44.integrations.Core.SendEmail({
        to: request.created_by,
        from_name: "SGOD Technical Assistance Portal",
        subject: `✅ Your TA Request ${request.request_number} has been resolved`,
        body: `Dear ${request.name},\n\nWe are pleased to inform you that your Technical Assistance request (${request.request_number}) regarding:\n\n"${request.concerns}"\n\nhas been marked as COMPLETED by SDO Masbate City.\n\nWe would love to hear about your experience! Please take a moment to share your feedback:\n\n👉 ${feedbackUrl}\n\nIf you have any further concerns, feel free to submit a new request through the portal.\n\nThank you for trusting our services.\n\nWarm regards,\nSGOD Technical Assistance Portal\nSDO Masbate City`
      }).catch(() => {});
    }

    // Email notification for Cancelled
    if (newStatus === "Cancelled" && request?.created_by) {
      base44.integrations.Core.SendEmail({
        to: request.created_by,
        from_name: "SGOD Technical Assistance Portal",
        subject: `TA Request ${request.request_number} has been cancelled`,
        body: `Dear ${request.name},\n\nWe would like to inform you that your Technical Assistance request (${request.request_number}) regarding:\n\n"${request.concerns}"\n\nhas been marked as CANCELLED.\n\nIf you believe this was done in error or you still need assistance, please do not hesitate to submit a new request through the portal or contact us directly.\n\nThank you for your understanding.\n\nWarm regards,\nSGOD Technical Assistance Portal\nSDO Masbate City`
      }).catch(() => {});
    }

    setRequest(prev => ({ ...prev, request_status: newStatus }));
    setUpdatingStatus(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Request not found.</p>
          <Link to={createPageUrl("MyRequests")}>
            <Button className="mt-3">Back to Requests</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sc = statusConfig[request.request_status] || statusConfig["Pending"];
  const StatusIcon = sc.icon;
  const isAdmin = isAdminUser(user);
  const canChangeStatus = canUpdateStatus(user);
  const canSeeAllRequests = canViewAllRequests(user);
  const slaStatus = getSLAStatus(request);
  const slaDueDate = getSLADueDate(request);

  const downloadTAR = async () => {
    setGeneratingTAR(true);
    await generateTAR(request);
    setGeneratingTAR(false);
  };

  const downloadPDF = () => {
    const lines = [
      `SDO MASBATE CITY — TECHNICAL ASSISTANCE REQUEST SUMMARY`,
      `========================================================`,
      ``,
      `Request No.:     ${request.request_number || "—"}`,
      `Status:          ${request.request_status}`,
      `Priority:        ${request.priority}`,
      `Category:        ${request.category}`,
      `Submitted:       ${request.created_date ? format(new Date(request.created_date), "MMMM d, yyyy · h:mm a") : "—"}`,
      slaDueDate ? `SLA Due Date:    ${format(slaDueDate, "MMMM d, yyyy")}` : "",
      ``,
      `--- REQUESTER INFORMATION ---`,
      `Name:            ${request.name}`,
      `Position:        ${request.position}`,
      `School:          ${request.school || "—"}`,
      ``,
      `--- CONCERN DETAILS ---`,
      `Concerns:`,
      request.concerns,
      ``,
      request.implemented_actions ? `Implemented Actions / Solution:\n${request.implemented_actions}\n` : "",
      request.status_of_issue ? `Status of Issue: ${request.status_of_issue}\n` : "",
      `Technical Assistance Needed:`,
      request.ta_needed,
      ``,
      request.preferred_date ? `Preferred Date:  ${format(new Date(request.preferred_date), "MMMM d, yyyy")}` : "",
      ``,
      `--- ASSIGNMENT ---`,
      `Assigned To:     ${request.assigned_to_name || "Unassigned"}`,
      `Assigned Email:  ${request.assigned_to_email || "—"}`,
      `Assignment Status: ${request.assignment_status || "—"}`,
    ].filter(l => l !== undefined).join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TA-Request-${request.request_number || request.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("MyRequests")}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-slate-800 text-sm">Request Detail</h1>
              <p className="text-xs text-slate-400 font-mono">{request.request_number}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link to={createPageUrl("AssignmentSettings")}>
                <Button size="sm" variant="ghost" className="rounded-xl text-slate-500 gap-1">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            )}
            {request.request_status === "Completed" &&
              (isAdmin || request.assigned_to_email === user?.email) && (
              <Button
                size="sm"
                onClick={downloadTAR}
                disabled={generatingTAR}
                className="rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generatingTAR
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
                {generatingTAR ? "Generating..." : "Download TAR"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={downloadPDF} className="rounded-xl gap-1 border-slate-200">
              <Download className="w-4 h-4" /> Export
            </Button>
            {request.conversation_id && (
              <Link to={createPageUrl(`Chat?id=${request.conversation_id}`)}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-1">
                  <MessageSquare className="w-4 h-4" /> Chat
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* SLA Warning */}
        {slaStatus?.urgent && (
          <div className={`rounded-2xl px-4 py-3 flex items-center gap-2 ${slaStatus.color}`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-semibold">{slaStatus.label}</span>
            {slaDueDate && <span className="text-xs opacity-75 ml-auto">SLA: {format(slaDueDate, "MMM d, yyyy")}</span>}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${sc.color}`}>
                <StatusIcon className="w-4 h-4" />
                {request.request_status}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Priority</p>
              <span className="text-sm font-medium text-slate-700">{request.priority}</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Category</p>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{request.category}</span>
            </div>
            {slaDueDate && !slaStatus?.urgent && (
              <div>
                <p className="text-xs text-slate-400 mb-1">SLA Due</p>
                <span className={`text-xs px-2 py-1 rounded-full ${slaStatus?.color || "bg-slate-100 text-slate-500"}`}>
                  {slaStatus?.label || format(slaDueDate, "MMM d")}
                </span>
              </div>
            )}
          </div>

          {canChangeStatus && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Update Status</p>
              <div className="flex gap-2 items-center">
                <Select value={request.request_status} onValueChange={updateStatus} disabled={updatingStatus}>
                  <SelectTrigger className="rounded-xl border-slate-200 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(statusConfig).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {updatingStatus && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
              </div>
            </div>
          )}
        </div>

        {/* Assignment Panel — visible to assigned person, assignees, approvers, or admins */}
        {(isAdmin || canSeeAllRequests || request.assigned_to_email === user?.email) && (
          <AssignmentPanel
            request={request}
            user={user}
            onUpdate={handleAssignmentUpdate}
          />
        )}

        {/* Requester Info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Requester</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Name</p>
                <p className="text-sm font-medium text-slate-800">{request.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Position</p>
                <p className="text-sm font-medium text-slate-800">{request.position}</p>
              </div>
            </div>
            {request.school && (
              <div className="flex items-start gap-2 col-span-2">
                <School className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">School</p>
                  <p className="text-sm font-medium text-slate-800">{request.school}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Concern Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Concern Details</h3>
          <Section label="Concerns" value={request.concerns} />
          {request.implemented_actions && <Section label="Implemented Actions / Solution" value={request.implemented_actions} />}
          {request.status_of_issue && <Section label="Status of Issue" value={request.status_of_issue} />}
          <Section label="Technical Assistance Needed" value={request.ta_needed} />
          {request.preferred_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-xs text-slate-400">Preferred Date: </span>
                <span className="text-sm font-medium text-slate-700">
                  {format(new Date(request.preferred_date), "MMMM d, yyyy")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Created */}
        <p className="text-xs text-slate-400 text-center pb-4">
          Submitted {request.created_date ? format(new Date(request.created_date), "MMM d, yyyy · h:mm a") : ""}
        </p>
      </div>
    </div>
  );
}

function Section({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
    </div>
  );
}
