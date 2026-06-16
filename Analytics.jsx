import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { ArrowLeft, TrendingUp, Clock, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInHours, format, subDays, startOfWeek, subMonths } from "date-fns";

const CATEGORY_COLORS = {
  "SBM Concerns": "#6366f1",
  "Planning and Research": "#f59e0b"
};

const STATUS_COLORS = {
  "Pending": "#f59e0b",
  "Completed": "#10b981"
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
      <div className="bg-white border rounded-xl shadow px-3 py-2 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // ✅ MOCK DATA (replace later with real backend)
      const data = [
        {
          category: "SBM Concerns",
          request_status: "Completed",
          priority: "High",
          school: "Masbate NHS",
          created_date: "2026-05-01",
          updated_date: "2026-05-03"
        },
        {
          category: "Planning and Research",
          request_status: "Pending",
          priority: "Urgent",
          school: "Central School",
          created_date: "2026-06-10",
          updated_date: "2026-06-10"
        }
      ];

      setRequests(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const total = requests.length;
  const pending = requests.filter(r => r.request_status === "Pending").length;
  const completed = requests.filter(r => r.request_status === "Completed").length;

  const completedWithDates = requests.filter(r =>
    r.request_status === "Completed" && r.created_date && r.updated_date
  );

  const avgResolutionHours = completedWithDates.length > 0
    ? Math.round(
        completedWithDates.reduce((sum, r) =>
          sum + differenceInHours(new Date(r.updated_date), new Date(r.created_date)), 0
        ) / completedWithDates.length
      )
    : null;

  const statusData = Object.entries(
    requests.reduce((acc, r) => {
      const s = r.request_status || "Pending";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <Link to={createPageUrl("Home")}>
        <Button>Back</Button>
      </Link>

      <div>Total Requests: {total}</div>
      <div>Pending: {pending}</div>
      <div>Completed: {completed}</div>

      <div>
        Avg Resolution:
        {avgResolutionHours !== null ? `${avgResolutionHours} hrs` : "No data"}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={statusData} dataKey="value">
            {statusData.map((entry, i) => (
              <Cell key={i} fill={STATUS_COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={weeklyTrend}>
          <CartesianGrid />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Area dataKey="requests" stroke="#6366f1" fill="#6366f1" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
