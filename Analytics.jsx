import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import { ArrowLeft, TrendingUp, Clock, CheckCircle, AlertCircle, FileText, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInHours, format, subDays, parseISO, startOfWeek, startOfMonth, subMonths } from "date-fns";
import.meta.env.VITE_SUPABASE_URL

const CATEGORY_COLORS = {
  "SBM Concerns": "#6366f1",
  "Private School - Permit Renewal": "#8b5cf6",
  "Private School - TOSF": "#a78bfa",
  "Private School - Special Order": "#c4b5fd",
  "Youth Formation Division (YFD)": "#10b981",
  "Planning and Research": "#f59e0b",
  "Social Mobilization and Networking": "#f43f5e",
  "Human Resource Development": "#06b6d4",
  "Disaster Risk Reduction and Management (DRRM)": "#f97316",
  "Health and Nutrition Unit (HNU)": "#22c55e",
  "School Facilities and Constructions": "#78716c",
  "Technical Assistance (General)": "#3b82f6"
};

const STATUS_COLORS = {
  "Pending": "#f59e0b",
  "Acknowledged": "#3b82f6",
  "Scheduled": "#6366f1",
  "In Progress": "#8b5cf6",
  "Completed": "#10b981",
  "Cancelled": "#94a3b8"
};

const PRIORITY_COLORS = {
  "Low": "#94a3b8",
  "Medium": "#3b82f6",
  "High": "#f97316",
  "Urgent": "#ef4444"
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs">{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const data = await base44.entities.TARequest.list("-created_date", 500);
      setRequests(data);
    } catch (e) {}
    setLoading(false);
  };

  // --- Derived Stats ---
  const total = requests.length;
  const pending = requests.filter(r => r.request_status === "Pending").length;
  const inProgress = requests.filter(r => ["Acknowledged", "Scheduled", "In Progress"].includes(r.request_status)).length;
  const completed = requests.filter(r => r.request_status === "Completed").length;
  const urgent = requests.filter(r => r.priority === "Urgent").length;

  // Avg resolution time (hours) for completed requests
  const completedWithDates = requests.filter(r =>
    r.request_status === "Completed" && r.created_date && r.updated_date
  );
  const avgResolutionHours = completedWithDates.length > 0
    ? Math.round(completedWithDates.reduce((sum, r) =>
        sum + differenceInHours(new Date(r.updated_date), new Date(r.created_date)), 0
      ) / completedWithDates.length)
    : null;

  // By Category
  const categoryData = Object.entries(
    requests.reduce((acc, r) => {
      const cat = r.category || "Unknown";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name: name.replace("Private School - ", "PS - "), full: name, value }))
    .sort((a, b) => b.value - a.value);

  // By Status
  const statusData = Object.entries(
    requests.reduce((acc, r) => {
      const s = r.request_status || "Pending";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // By Priority
  const priorityData = ["Low", "Medium", "High", "Urgent"].map(p => ({
    name: p,
    value: requests.filter(r => r.priority === p).length
  })).filter(d => d.value > 0);

  // Weekly trend (last 8 weeks)
  const weeklyTrend = (() => {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7));
      const weekEnd = startOfWeek(subDays(new Date(), (i - 1) * 7));
      const count = requests.filter(r => {
        if (!r.created_date) return false;
        const d = new Date(r.created_date);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({ name: format(weekStart, "MMM d"), requests: count });
    }
    return weeks;
  })();

  // Resolution rate
  const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Resolved per school per month (last 6 months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    return { key: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") };
  });

  const resolvedRequests = requests.filter(r => r.request_status === "Completed" && r.school && r.updated_date);

  const schools = [...new Set(resolvedRequests.map(r => r.school))].sort();

  const schoolMonthData = schools.map(school => {
    const row = { school };
    last6Months.forEach(({ key, label }) => {
      row[label] = resolvedRequests.filter(r =>
        r.school === school && format(new Date(r.updated_date), "yyyy-MM") === key
      ).length;
    });
    row.total = resolvedRequests.filter(r => r.school === school).length;
    return row;
  }).sort((a, b) => b.total - a.total);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-slate-800">Analytics Dashboard</h1>
            <p className="text-xs text-slate-400">SDO Masbate City — Technical Assistance Overview</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={FileText} label="Total Requests" value={total} color="indigo" />
          <KPICard icon={Clock} label="Pending" value={pending} color="amber" />
          <KPICard icon={AlertCircle} label="In Progress" value={inProgress} color="violet" />
          <KPICard icon={CheckCircle} label="Completed" value={completed} color="emerald" />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Resolution Rate</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-emerald-600">{resolutionRate}%</span>
              <TrendingUp className="w-4 h-4 text-emerald-400 mb-1" />
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                style={{ width: `${resolutionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Avg. Resolution Time</p>
            {avgResolutionHours !== null ? (
              <div>
                <span className="text-3xl font-bold text-indigo-600">
                  {avgResolutionHours >= 24
                    ? `${Math.round(avgResolutionHours / 24)}d`
                    : `${avgResolutionHours}h`}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  {avgResolutionHours >= 24
                    ? `${avgResolutionHours} hours total`
                    : "from submission to completion"}
                </p>
              </div>
            ) : (
              <p className="text-slate-400 text-sm mt-2">No completed data yet</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 col-span-2 md:col-span-1">
            <p className="text-xs text-slate-400 mb-1">Urgent Requests</p>
            <span className={`text-3xl font-bold ${urgent > 0 ? "text-rose-600" : "text-slate-400"}`}>
              {urgent}
            </span>
            <p className="text-xs text-slate-400 mt-1">requiring immediate attention</p>
          </div>
        </div>

        {/* Requests by Status — Pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Requests by Status</h3>
            {statusData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Priority Distribution */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Requests by Priority</h3>
            {priorityData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Requests" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.name] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Weekly Request Trend (Last 8 Weeks)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyTrend}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#areaGrad)"
                dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#6366f1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Requests by Category */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Requests by Category</h3>
          {categoryData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, categoryData.length * 42)}>
              <BarChart data={categoryData} layout="vertical" barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Requests" radius={[0, 6, 6, 0]}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.full] || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Table */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Category Breakdown</h3>
          <div className="space-y-2">
            {categoryData.map((cat, i) => {
              const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.full] || "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 truncate">{cat.full}</span>
                      <span className="text-xs font-semibold text-slate-700 ml-2 flex-shrink-0">
                        {cat.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[cat.full] || "#6366f1"
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolved per School per Month */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-1 text-sm">Resolved Requests per School (Monthly)</h3>
          <p className="text-xs text-slate-400 mb-4">Completed requests grouped by school — last 6 months</p>
          {schoolMonthData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 pr-4 text-slate-500 font-medium w-40">School</th>
                    {last6Months.map(m => (
                      <th key={m.key} className="text-center py-2 px-2 text-slate-500 font-medium whitespace-nowrap">{m.label}</th>
                    ))}
                    <th className="text-center py-2 px-2 text-slate-700 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolMonthData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2 pr-4 text-slate-700 font-medium truncate max-w-[160px]" title={row.school}>{row.school}</td>
                      {last6Months.map(m => (
                        <td key={m.key} className="text-center py-2 px-2">
                          {row[m.label] > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                              {row[m.label]}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="text-center py-2 px-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                          {row.total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-slate-400 pb-2">
          Data based on {total} total request{total !== 1 ? "s" : ""} · SDO Masbate City TAMA
        </p>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", icon: "text-indigo-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", icon: "text-amber-500" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", icon: "text-violet-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "text-emerald-500" }
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
      No data available yet
    </div>
  );
}
