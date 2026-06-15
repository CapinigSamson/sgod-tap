import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Loader2, UserCog, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PERSONNEL, isAdminUser } from "@/components/assignment/personnelList";

const CATEGORIES = [
  "SBM Concerns",
  "Private School - Permit Renewal",
  "Private School - TOSF",
  "Private School - Special Order",
  "Youth Formation Division (YFD)",
  "Planning and Research",
  "Social Mobilization and Networking",
  "Human Resource Development",
  "Technical Assistance (General)"
];

export default function AssignmentSettings() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [user, setUser] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ category: "", assigned_to_email: "", assigned_to_name: "", keywords: "", is_active: true });
  const [addingSaving, setAddingSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [u, data] = await Promise.all([
        base44.auth.me(),
        base44.entities.CategoryAssignment.list()
      ]);
      setUser(u);
      setRules(data);
    } catch (e) {}
    setLoading(false);
  };

  const saveRule = async (rule) => {
    setSaving(rule.id);
    await base44.entities.CategoryAssignment.update(rule.id, {
      category: rule.category,
      assigned_to_email: rule.assigned_to_email,
      assigned_to_name: rule.assigned_to_name,
      keywords: rule.keywords,
      is_active: rule.is_active
    });
    setSaving(null);
  };

  const deleteRule = async (id) => {
    setDeleting(id);
    await base44.entities.CategoryAssignment.delete(id);
    setRules(prev => prev.filter(r => r.id !== id));
    setDeleting(null);
  };

  const addRule = async () => {
    if (!newRule.category || !newRule.assigned_to_email || !newRule.assigned_to_name) return;
    setAddingSaving(true);
    const created = await base44.entities.CategoryAssignment.create(newRule);
    setRules(prev => [...prev, created]);
    setNewRule({ category: "", assigned_to_email: "", assigned_to_name: "", keywords: "", is_active: true });
    setShowAdd(false);
    setAddingSaving(false);
  };

  const updateLocal = (id, field, value) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  if (!isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Access restricted to admins.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("MyRequests")}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-slate-800">Assignment Settings</h1>
              <p className="text-xs text-slate-400">Auto-assign TA requests to SDO personnel by category</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-1"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Info Banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-700">
          <strong>How it works:</strong> When a new TA request is submitted, the system checks for keyword matches first, then falls back to category-based assignment. The assigned personnel receives a notification and must accept or reassign the task.
        </div>

        {/* Add Rule Form */}
        {showAdd && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-200">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">New Assignment Rule</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500">Category</Label>
                <Select value={newRule.category} onValueChange={v => setNewRule({ ...newRule, category: v })}>
                  <SelectTrigger className="mt-1 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Personnel</Label>
                <Select
                  value={newRule.assigned_to_email}
                  onValueChange={v => {
                    const p = PERSONNEL.find(x => x.email === v);
                    if (p) setNewRule({ ...newRule, assigned_to_email: p.email, assigned_to_name: p.name });
                  }}
                >
                  <SelectTrigger className="mt-1 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select personnel..." />
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
                  </SelectContent>
                </Select>
                {newRule.assigned_to_email && (
                  <p className="text-xs text-slate-400 mt-1 ml-1">{newRule.assigned_to_email}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-slate-500">Keywords (comma-separated, optional)</Label>
                <Input
                  value={newRule.keywords}
                  onChange={e => setNewRule({ ...newRule, keywords: e.target.value })}
                  placeholder="e.g. permit, accreditation, TOSF"
                  className="mt-1 rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={addRule}
                  disabled={addingSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-1"
                >
                  {addingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save Rule
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16">
            <UserCog className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No assignment rules yet</p>
            <p className="text-slate-400 text-sm">Add rules to auto-assign requests to SDO personnel</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                    {rule.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={v => updateLocal(rule.id, "is_active", v)}
                  />
                  <span className="text-xs text-slate-400">{rule.is_active ? "Active" : "Off"}</span>
                </div>
              </div>

              <div className="mb-3">
                <Label className="text-xs text-slate-400">Personnel</Label>
                <Select
                  value={rule.assigned_to_email}
                  onValueChange={v => {
                    const p = PERSONNEL.find(x => x.email === v);
                    if (p) {
                      updateLocal(rule.id, "assigned_to_email", p.email);
                      updateLocal(rule.id, "assigned_to_name", p.name);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 rounded-xl border-slate-200 text-sm">
                    <SelectValue placeholder="Select personnel..." />
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
                  </SelectContent>
                </Select>
                {rule.assigned_to_email && (
                  <p className="text-xs text-slate-400 mt-1 ml-1">{rule.assigned_to_email}</p>
                )}
              </div>

              <div className="mb-3">
                <Label className="text-xs text-slate-400">Keywords (optional override)</Label>
                <Input
                  value={rule.keywords || ""}
                  onChange={e => updateLocal(rule.id, "keywords", e.target.value)}
                  placeholder="comma-separated keywords"
                  className="mt-1 rounded-xl border-slate-200 text-sm h-8"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRule(rule.id)}
                  disabled={deleting === rule.id}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  {deleting === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveRule(rule)}
                  disabled={saving === rule.id}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-1"
                >
                  {saving === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
