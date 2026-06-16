import { useState } from "react";
import { PERSONNEL } from "@/components/assignment/personnelList";
import { Button } from "@/components/ui/button";
import { Loader2, X, ChevronDown } from "lucide-react";

const STATUSES = ["Pending", "Acknowledged", "Scheduled", "In Progress", "Completed", "Cancelled"];
const ASSIGNEES = PERSONNEL.filter(p => p.role === "assignee" || p.role === "approver");

export default function BulkActionBar({ selectedIds, onClear, onDone }) {
  const [applying, setApplying] = useState(false);

  const applyStatus = async (status) => {
    setApplying(true);
    await Promise.all(selectedIds.map(id => base44.entities.TARequest.update(id, { request_status: status })));
    setApplying(false);
    onDone();
  };

  const applyAssign = async (person) => {
    setApplying(true);
    await Promise.all(selectedIds.map(id =>
      base44.entities.TARequest.update(id, {
        assigned_to_email: person.email,
        assigned_to_name: person.name,
        assignment_status: "Pending Acceptance",
        assigned_at: new Date().toISOString(),
      })
    ));
    setApplying(false);
    onDone();
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{selectedIds.length} selected</span>
          <button onClick={onClear} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status dropdown */}
          <div className="relative group">
            <button
              disabled={applying}
              className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors font-medium"
            >
              {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Set Status <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute bottom-full mb-1 left-0 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block min-w-[160px] z-50">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => applyStatus(s)}
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Assign dropdown */}
          <div className="relative group">
            <button
              disabled={applying}
              className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors font-medium"
            >
              Assign To <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute bottom-full mb-1 left-0 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block min-w-[200px] z-50 max-h-48 overflow-y-auto">
              {ASSIGNEES.map(p => (
                <button
                  key={p.email}
                  onClick={() => applyAssign(p)}
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
