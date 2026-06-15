import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Clock, CheckCircle, AlertCircle, XCircle, Search, Settings, Trash2, Download, Loader2, Archive, ArchiveRestore, History, CheckSquare } from "lucide-react";
import { isAdminUser, canViewAllRequests, isAssignee, isApprover } from "@/components/assignment/personnelList";
import BulkActionBar from "@/components/requests/BulkActionBar";
import PullToRefresh from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { getSLAStatus } from "@/components/sla/slaConfig";
import { generateTAR } from "@/components/tar/generateTAR";

const statusConfig = {
  "Pending": { color: "bg-amber-100 text-amber-700", icon: Clock },
  "Acknowledged": { color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  "Scheduled": { color: "bg-indigo-100 text-indigo-700", icon: Clock },
  "In Progress": { color: "bg-violet-100 text-violet-700", icon: AlertCircle },
  "Completed": { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  "Cancelled": { color: "bg-slate-100 text-slate-500", icon: XCircle }
};

const priorityConfig = {
  "Low": "bg-slate-100 text-slate-500",
  "Medium": "bg-blue-100 text-blue-600",
  "High": "bg-orange-100 text-orange-600",
  "Urgent": "bg-rose-100 text-rose-600"
};

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [user, setUser] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [generatingTAR, setGeneratingTAR] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterSchool, setFilterSchool] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const toggleSelect = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDone = () => {
    setSelectedIds([]);
    setBulkMode(false);
    loadRequests();
  };

  const handleArchive = async (e, request) => {
    e.preventDefault();
    e.stopPropagation();
    setArchiving(request.id);
    await base44.entities.TARequest.update(request.id, { is_archived: !request.is_archived });
    setRequests(prev => prev.map(r => r.id === request.id ? { ...r, is_archived: !r.is_archived } : r));
    setArchiving(null);
  };

  const handleDownloadTAR = async (e, request) => {
    e.preventDefault();
    e.stopPropagation();
    setGeneratingTAR(request.id);
    await generateTAR(request);
    setGeneratingTAR(null);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const canSeeAll = canViewAllRequests(u);
      const data = canSeeAll
        ? await base44.entities.TARequest.list("-created_date")
        : await base44.entities.TARequest.filter({ created_by: u?.email }, "-created_date");
      setRequests(data);

      // Send reminder emails for pending requests older than 3 days (admin only)
      if (isAdminUser(u) && data.length > 0) {
        sendPendingReminders(data);
      }
    } catch (e) {}
    setLoading(false);
  };

  const sendPendingReminders = async (data) => {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const overdue = data.filter(r =>
      r.request_status === "Pending" &&
      !r.is_archived &&
      r.assigned_to_email &&
      r.created_date &&
      (now - new Date(r.created_date).getTime()) > THREE_DAYS_MS
    );
    if (overdue.length === 0) return;

    // Group by assignee to send one email per person
    const byAssignee = overdue.reduce((acc, r) => {
      const key = r.assigned_to_email;
      if (!acc[key]) acc[key] = { name: r.assigned_to_name || r.assigned_to_email, requests: [] };
      acc[key].requests.push(r);
      return acc;
    }, {});

    await Promise.all(Object.entries(byAssignee).map(([email, { name, requests }]) => {
      const list = requests.map(r =>
        `• [${r.request_number || r.id}] ${r.concerns?.slice(0, 80) || "No details"} — ${r.school || "N/A"} (submitted ${format(new Date(r.created_date), "MMM d, yyyy")})`
      ).join("\n");
      return base44.integrations.Core.SendEmail({
        to: email,
        from_name: "SGOD Technical Assistance Portal",
        subject: `Reminder: ${requests.length} Pending TA Request${requests.length > 1 ? "s" : ""} Awaiting Action`,
        body: `Dear ${name},\n\nThis is a friendly reminder that the following Technical Assistance request${requests.length > 1 ? "s have" : " has"} been pending for more than 3 days and require${requests.length > 1 ? "" : "s"} your attention:\n\n${list}\n\nPlease log in to the SGOD TAP to take action on ${requests.length > 1 ? "these requests" : "this request"} at your earliest convenience.\n\nThank you,\nSGOD Technical Assistance Portal`
      }).catch(() => {}); // silently ignore individual send failures
    }));
  };

  const clearAll = async () => {
    if (!window.confirm("Delete all requests? This cannot be undone.")) return;
    setClearing(true);
    const canSeeAll = canViewAllRequests(user);
    const toDelete = canSeeAll
      ? await base44.entities.TARequest.list()
      : await base44.entities.TARequest.filter({ created_by: user?.email });
    await Promise.all(toDelete.map(r => base44.entities.TARequest.delete(r.id)));
    setRequests([]);
    setClearing(false);
  };

  const schools = [...new Set(requests.map(r => r.school).filter(Boolean))].sort();

  const filtered = requests.filter(r => {
    const matchSearch = !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.concerns?.toLowerCase().includes(search.toLowerCase()) ||
      r.request_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase()) ||
      r.school?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || r.request_status === filterStatus;
    const matchSchool = !filterSchool || r.school === filterSchool;
    const matchArchive = showArchive ? r.is_archived : !r.is_archived;
    const matchDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const d = r.created_date ? new Date(r.created_date) : null;
      if (!d) return false;
      if (dateFrom && d < startOfDay(new Date(dateFrom))) return false;
      if (dateTo && d > endOfDay(new Date(dateTo))) return false;
      return true;
    })();
    return matchSearch && matchStatus && matchSchool && matchArchive && matchDate;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-bold text-slate-800">{canViewAllRequests(user) ? "All Requests" : "My Requests"}</h1>
          </div>
          <div className="flex gap-2">
            {isAdminUser(user) && (
              <Link to={createPageUrl("AssignmentSettings")}>
                <Button size="sm" variant="outline" className="rounded-xl gap-1 border-slate-200">
                  <Settings className="w-4 h-4" /> Assign Rules
                </Button>
              </Link>
            )}
            {isAdminUser(user) && !showArchive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setBulkMode(v => !v); setSelectedIds([]); }}
                className={`rounded-xl gap-1 ${bulkMode ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-slate-200 text-slate-600"}`}
              >
                <CheckSquare className="w-4 h-4" /> {bulkMode ? "Cancel" : "Select"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowArchive(v => !v)}
              className={`rounded-xl gap-1 ${showArchive ? "bg-amber-50 border-amber-200 text-amber-700" : "border-slate-200 text-slate-600"}`}
            >
              <History className="w-4 h-4" /> {showArchive ? "Active" : "History"}
            </Button>
            {!showArchive && requests.length > 0 && (
              <Button size="sm" variant="outline" onClick={clearAll} disabled={clearing} className="rounded-xl gap-1 border-rose-200 text-rose-500 hover:bg-rose-50">
                <Trash2 className="w-4 h-4" /> {clearing ? "Clearing..." : "Clear All"}
              </Button>
            )}
            <Link to={createPageUrl("TARequest")}>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-1">
                <Plus className="w-4 h-4" /> New
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <PullToRefresh onRefresh={loadRequests}>
      <div className="max-w-3xl mx-auto px-4 py-5 flex-1">
        {showArchive && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            <History className="w-4 h-4 flex-shrink-0" />
            <span>Viewing archived (completed) requests. Click <strong>Active</strong> to return to the main dashboard.</span>
          </div>
        )}
        {/* Search & Filter */}
        <div className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search requests..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="All">All Status</option>
            {Object.keys(statusConfig).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* School & Date filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          <select
            value={filterSchool}
            onChange={e => setFilterSchool(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 flex-1 min-w-[160px]"
          >
            <option value="">All Schools</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="To"
          />
          {(filterSchool || dateFrom || dateTo) && (
            <button
              onClick={() => { setFilterSchool(""); setDateFrom(""); setDateTo(""); }}
              className="text-xs text-indigo-600 hover:underline px-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No requests found</p>
            <p className="text-slate-400 text-sm mt-1">Submit your first TA request</p>
            <Link to={createPageUrl("TARequest")}>
              <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl">New Request</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const sc = statusConfig[r.request_status] || statusConfig["Pending"];
              const StatusIcon = sc.icon;
              const isSelected = selectedIds.includes(r.id);
              return (
                <Link key={r.id} to={bulkMode ? "#" : createPageUrl(`RequestDetail?id=${r.id}`)} onClick={bulkMode ? (e) => toggleSelect(e, r.id) : undefined}>
                  <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${isSelected ? "border-indigo-400 bg-indigo-50/40 shadow-indigo-100" : "border-slate-100 hover:shadow-md hover:border-slate-200"}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2">
                        {bulkMode && (
                          <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                            {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-mono text-slate-400">{r.request_number}</span>
                          <h3 className="font-semibold text-slate-800 text-sm mt-0.5 line-clamp-1">{r.concerns}</h3>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${sc.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {r.request_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">{r.name}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{r.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig[r.priority] || priorityConfig["Medium"]}`}>
                        {r.priority}
                      </span>
                      {(() => {
                        const sla = getSLAStatus(r);
                        return sla ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sla.color}`}>
                            {sla.label}
                          </span>
                        ) : null;
                      })()}
                      {r.request_status === "Completed" &&
                        (isAdminUser(user) || isApprover(user) || isAssignee(user) || r.assigned_to_email === user?.email) && (
                        <button
                          onClick={(e) => handleDownloadTAR(e, r)}
                          disabled={generatingTAR === r.id}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium transition-colors"
                        >
                          {generatingTAR === r.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Download className="w-3 h-3" />}
                          TAR
                        </button>
                      )}
                      {r.request_status === "Completed" && (
                        <button
                          onClick={(e) => handleArchive(e, r)}
                          disabled={archiving === r.id}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium transition-colors"
                        >
                          {archiving === r.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : r.is_archived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                          {r.is_archived ? "Unarchive" : "Archive"}
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      </PullToRefresh>
      {bulkMode && selectedIds.length > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          onClear={() => setSelectedIds([])}
          onDone={handleBulkDone}
        />
      )}
    </div>
  );
}
