"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";
import Sidebar from "@/app/components/Sidebar";
import { isBranchManager } from "@/lib/roles";
import { ALL_BRANCHES } from "@/lib/manpowerUtils";
import {
  getWeekRanges,
  type WeekRange,
  type SelectionsMap,
} from "@/lib/manpowerDashboard";

type ScheduleRow = {
  id: string;
  branch: string;
  startDate: string;
  endDate: string;
  selections: SelectionsMap;
  notes: Record<string, string>;
  status: string;
};

type WeekKey = "lastWeek" | "thisWeek" | "nextWeek";

const WEEK_LABELS: Record<WeekKey, string> = {
  lastWeek: "Last Week",
  thisWeek: "This Week",
  nextWeek: "Next Week",
};

export default function ManpowerDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const userBranch = (session?.user as { branchName?: string } | undefined)?.branchName;
  const isBM = isBranchManager(userRole) && !!userBranch;

  // Computed once per mount — using today at render time.
  const weekRanges = useMemo(() => getWeekRanges(new Date()), []);
  const [weekKey, setWeekKey] = useState<WeekKey>("thisWeek");
  const selectedWeek: WeekRange = weekRanges[weekKey];

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSchedules = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/schedules");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? "Failed to load");
        if (!cancelled) setSchedules(data.schedules as ScheduleRow[]);
      } catch (err) {
        if (!cancelled) setFetchError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSchedules();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter to the 3 week ranges for current scope
  const relevantSchedules = useMemo(() => {
    const weekStarts = new Set<string>([
      weekRanges.lastWeek.startDate,
      weekRanges.thisWeek.startDate,
      weekRanges.nextWeek.startDate,
    ]);
    return schedules.filter((s) => {
      if (!weekStarts.has(s.startDate)) return false;
      if (isBM && s.branch !== userBranch) return false;
      return true;
    });
  }, [schedules, weekRanges, isBM, userBranch]);

  const headerBranchLabel = isBM ? userBranch : "All Branches";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)} />

      <main className="flex-1 h-screen flex flex-col overflow-hidden relative">
        {/* Sticky Header */}
        <div className="shrink-0 w-full mx-auto px-6 pt-6 z-50 bg-slate-50">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push("/manpower-schedule")}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:bg-blue-600 transition-colors"
            >
              <span className="text-xl">👥</span>
              <span className="text-base font-black uppercase tracking-wide leading-none">HRMS</span>
            </button>
            <div className="h-8 w-px bg-slate-300" />
            <h1 className="text-lg font-black uppercase tracking-wide text-slate-800 leading-none m-0 flex items-center gap-4">
              <span>Manpower Dashboard — {headerBranchLabel}</span>
              <span className="text-sm bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg font-bold tracking-widest uppercase">
                {format(parseISO(selectedWeek.startDate), "dd MMM yyyy")} – {format(parseISO(selectedWeek.endDate), "dd MMM yyyy")}
              </span>
            </h1>
          </div>

          {/* Week Pills */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4 flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 mr-2">Week:</span>
            {(Object.keys(WEEK_LABELS) as WeekKey[]).map((k) => {
              const range = weekRanges[k];
              const active = k === weekKey;
              return (
                <button
                  key={k}
                  onClick={() => setWeekKey(k)}
                  className={`px-5 py-3 rounded-xl font-black uppercase text-sm tracking-wide transition-all shadow-sm flex flex-col items-center ${
                    active
                      ? "bg-[#2D3F50] text-white shadow-lg scale-105"
                      : "bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{WEEK_LABELS[k]}</span>
                  <span className={`text-[9px] font-bold mt-1 ${active ? "text-slate-300" : "text-slate-400"}`}>
                    {format(parseISO(range.startDate), "dd MMM")} – {format(parseISO(range.endDate), "dd MMM")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrolling Body */}
        <div className="flex-1 overflow-y-auto w-full mx-auto px-6 pb-12">
          {loading ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
              Loading schedules…
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center justify-between">
              <span className="text-red-700 font-bold">Couldn&apos;t load schedules. {fetchError}</span>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold uppercase text-xs"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="text-slate-500 font-bold uppercase tracking-widest text-sm p-6">
              {relevantSchedules.length} schedule(s) for {WEEK_LABELS[weekKey]}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
