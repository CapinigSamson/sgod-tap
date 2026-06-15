import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Send, Loader2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MobileSelect from "@/components/MobileSelect";
import { autoAssignRequest, assignRequest } from "@/components/assignment/assignmentUtils";
import ConfirmSubmitDialog from "@/components/ConfirmSubmitDialog.jsx";

const categoryColors = {
  "SBM Concerns": "from-blue-500 to-blue-600",
  "Private School - Permit Renewal": "from-violet-500 to-violet-600",
  "Private School - TOSF": "from-violet-500 to-violet-600",
  "Private School - Special Order": "from-violet-500 to-violet-600",
  "Youth Formation Division (YFD)": "from-emerald-500 to-emerald-600",
  "Planning and Research": "from-amber-500 to-amber-600",
  "Social Mobilization and Networking": "from-rose-500 to-rose-600",
  "Human Resource Development": "from-cyan-500 to-cyan-600",
  "Technical Assistance (General)": "from-indigo-500 to-indigo-600"
};

export default function TARequest() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedCategory = urlParams.get("category") || "";

  const [form, setForm] = useState({
    name: "",
    position: "",
    school: "",
    category: preselectedCategory,
    concerns: "",
    implemented_actions: "",
    status_of_issue: "",
    ta_needed: "",
    preferred_date: "",
    priority: "Medium"
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [user, setUser] = useState(null);
  const [requestNumber, setRequestNumber] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) {
        setUser(u);
        setForm(f => ({ ...f, name: u.full_name || "" }));
      }
    }).catch(() => {});
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const rNum = `TA-${Date.now().toString().slice(-6)}`;
      const request = await base44.entities.TARequest.create({
        ...form,
        request_number: rNum,
        request_status: "Pending"
      });

      // Create conversation
      const conv = await base44.entities.Conversation.create({
        request_id: request.id,
        request_number: rNum,
        subject: `[${form.category}] ${form.concerns.slice(0, 60)}`,
        participants: [user?.email].filter(Boolean),
        category: form.category,
        contact_number: user?.contact_number || "",
        last_message: "TA Request submitted.",
        last_message_at: new Date().toISOString()
      });

      // Link conversation to request
      await base44.entities.TARequest.update(request.id, { conversation_id: conv.id });

      // Create first message
      await base44.entities.Message.create({
        conversation_id: conv.id,
        sender_email: user?.email || "anonymous",
        sender_name: form.name,
        sender_role: "school",
        content: `New TA Request submitted.\n\nConcern: ${form.concerns}\n\nTA Needed: ${form.ta_needed}`,
        is_read: false
      });

      // Auto-assign based on category/keywords (non-blocking, don't fail submission)
      try {
        const rule = await autoAssignRequest({ ...form, id: request.id });
        if (rule) await assignRequest(request.id, rNum, rule);
      } catch (_) {}

      // Notify SDO admins (non-blocking)
      try {
        const admins = await base44.entities.User.filter({ role: "admin" });
        for (const admin of admins) {
          await base44.entities.Notification.create({
            recipient_email: admin.email,
            title: `New TA Request: ${rNum}`,
            message: `${form.name} (${form.position}) submitted a request under ${form.category}.`,
            type: "new_request",
            reference_id: request.id,
            is_read: false,
            link: createPageUrl(`RequestDetail?id=${request.id}`)
          });
        }
      } catch (_) {}

      setRequestNumber(rNum);
      setSubmitted(true);
    } catch (err) {
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const colorGrad = categoryColors[form.category] || "from-indigo-500 to-indigo-600";

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h2>
          <p className="text-slate-500 text-sm mb-4">Your technical assistance request has been received by SDO Masbate City.</p>
          <div className={`inline-block bg-gradient-to-r ${colorGrad} text-white px-5 py-2 rounded-full font-bold text-lg mb-6 shadow-sm`}>
            {requestNumber}
          </div>
          <p className="text-xs text-slate-400 mb-6">Save this number to track your request. You will be notified once SDO responds.</p>
          <div className="space-y-3">
            <Link to={createPageUrl("MyRequests")} className="block">
              <Button className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl">
                View My Requests
              </Button>
            </Link>
            <Link to={createPageUrl("Home")} className="block">
              <Button variant="outline" className="w-full rounded-xl">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-slate-800 text-sm">Request Technical Assistance</h1>
            {form.category && <p className="text-xs text-slate-500">{form.category}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <ConfirmSubmitDialog
          open={showConfirm}
          form={form}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Category */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Concern Area</h3>
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Category <span className="text-rose-500">*</span></Label>
              <MobileSelect
                value={form.category}
                onValueChange={v => setForm({...form, category: v})}
                options={Object.keys(categoryColors).map(c => ({ value: c, label: c }))}
                placeholder="Select category"
                triggerClassName="rounded-xl border-slate-200 w-full"
                label="Category"
              />
            </div>
          </div>

          {/* Requester Info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Requester Information</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600">Name <span className="text-rose-500">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Full Name"
                  required
                  className="mt-1 rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">Position / Designation <span className="text-rose-500">*</span></Label>
                <Input
                  value={form.position}
                  onChange={e => setForm({...form, position: e.target.value})}
                  placeholder="e.g. School Principal, Teacher"
                  required
                  className="mt-1 rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">School Name</Label>
                <Input
                  value={form.school}
                  onChange={e => setForm({...form, school: e.target.value})}
                  placeholder="Name of your school"
                  className="mt-1 rounded-xl border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Concern Details */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Concern Details</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600">Concerns <span className="text-rose-500">*</span></Label>
                <Textarea
                  value={form.concerns}
                  onChange={e => setForm({...form, concerns: e.target.value})}
                  placeholder="Describe your concern in detail..."
                  required
                  rows={4}
                  className="mt-1 rounded-xl border-slate-200 resize-none"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">Implemented Actions / Solution</Label>
                <Textarea
                  value={form.implemented_actions}
                  onChange={e => setForm({...form, implemented_actions: e.target.value})}
                  placeholder="What actions or solutions have already been tried?"
                  rows={3}
                  className="mt-1 rounded-xl border-slate-200 resize-none"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">Status of the Issue</Label>
                <MobileSelect
                  value={form.status_of_issue}
                  onValueChange={v => setForm({...form, status_of_issue: v})}
                  options={["Unresolved", "Partially Resolved", "Ongoing", "Resolved"].map(s => ({ value: s, label: s }))}
                  placeholder="Select status"
                  triggerClassName="mt-1 rounded-xl border-slate-200 w-full"
                  label="Status of the Issue"
                />
              </div>
            </div>
          </div>

          {/* TA Details */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Technical Assistance Details</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600">Technical Assistance Needed <span className="text-rose-500">*</span></Label>
                <Textarea
                  value={form.ta_needed}
                  onChange={e => setForm({...form, ta_needed: e.target.value})}
                  placeholder="Describe the specific technical assistance you need from SDO..."
                  required
                  rows={4}
                  className="mt-1 rounded-xl border-slate-200 resize-none"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">Preferred Date for TA Conduct</Label>
                <Input
                  type="date"
                  value={form.preferred_date}
                  onChange={e => setForm({...form, preferred_date: e.target.value})}
                  className="mt-1 rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">Priority Level</Label>
                <MobileSelect
                  value={form.priority}
                  onValueChange={v => setForm({...form, priority: v})}
                  options={["Low", "Medium", "High", "Urgent"].map(p => ({ value: p, label: p }))}
                  placeholder="Select priority"
                  triggerClassName="mt-1 rounded-xl border-slate-200 w-full"
                  label="Priority Level"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className={`w-full bg-gradient-to-r ${colorGrad} hover:opacity-90 text-white font-semibold py-3 rounded-2xl shadow-lg transition-all`}
          >
            {submitting ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
            ) : (
              <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Submit Request</span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
