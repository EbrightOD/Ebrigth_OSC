"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  BarChart3,
  Users,
  Mail,
  MessageSquare,
  Package,
  GraduationCap,
  Lock,
  ArrowRight,
  LucideIcon,
} from "lucide-react";

type ColorKey = "red" | "purple" | "emerald" | "sky" | "amber" | "rose" | "indigo";

interface DashboardCard {
  id: string;
  title: string;
  Icon: LucideIcon;
  color: ColorKey;
  items: { name: string; href: string }[];
}

// Full Tailwind class strings (not interpolated) so the v4 scanner extracts them.
const PALETTE: Record<ColorKey, {
  tile: string;
  icon: string;
  stripe: string;
  hoverBorder: string;
  hoverShadow: string;
  arrow: string;
}> = {
  red: {
    tile: "bg-brand-red-soft",
    icon: "text-brand-red",
    stripe: "border-l-brand-red",
    hoverBorder: "hover:border-brand-red",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(237,28,36,0.14)]",
    arrow: "text-brand-red",
  },
  purple: {
    tile: "bg-purple-50",
    icon: "text-purple-600",
    stripe: "border-l-purple-500",
    hoverBorder: "hover:border-purple-500",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(147,51,234,0.14)]",
    arrow: "text-purple-600",
  },
  emerald: {
    tile: "bg-emerald-50",
    icon: "text-emerald-600",
    stripe: "border-l-emerald-500",
    hoverBorder: "hover:border-emerald-500",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(16,185,129,0.14)]",
    arrow: "text-emerald-600",
  },
  sky: {
    tile: "bg-sky-50",
    icon: "text-sky-600",
    stripe: "border-l-sky-500",
    hoverBorder: "hover:border-sky-500",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(14,165,233,0.14)]",
    arrow: "text-sky-600",
  },
  amber: {
    tile: "bg-amber-50",
    icon: "text-amber-600",
    stripe: "border-l-amber-500",
    hoverBorder: "hover:border-amber-500",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(245,158,11,0.14)]",
    arrow: "text-amber-600",
  },
  rose: {
    tile: "bg-rose-50",
    icon: "text-rose-600",
    stripe: "border-l-rose-500",
    hoverBorder: "hover:border-rose-500",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(244,63,94,0.14)]",
    arrow: "text-rose-600",
  },
  indigo: {
    tile: "bg-indigo-50",
    icon: "text-indigo-600",
    stripe: "border-l-indigo-500",
    hoverBorder: "hover:border-indigo-500",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(99,102,241,0.14)]",
    arrow: "text-indigo-600",
  },
};

const dashboards: DashboardCard[] = [
  {
    id: "library",
    title: "Library",
    Icon: BookOpen,
    color: "purple",
    items: [
      { name: "Documents", href: "#" },
      { name: "Resources", href: "#" },
    ],
  },
  {
    id: "internal-dashboard",
    title: "Internal Dashboard",
    Icon: BarChart3,
    color: "emerald",
    items: [
      { name: "Analytics", href: "#" },
      { name: "Reports", href: "#" },
    ],
  },
  {
    id: "hrms",
    title: "HRMS",
    Icon: Users,
    color: "red",
    items: [
      { name: "Employee Dashboard", href: "/dashboard-employee-management" },
      { name: "Manpower Planning", href: "/manpower-schedule" },
      { name: "Attendance", href: "/attendance" },
      { name: "Claims", href: "/claims" },
      { name: "Manpower Cost Report", href: "/manpower-cost-report" },
    ],
  },
  {
    id: "crm",
    title: "CRM",
    Icon: Mail,
    color: "sky",
    items: [
      { name: "Content Manager", href: "#" },
      { name: "Media", href: "#" },
    ],
  },
  {
    id: "sms",
    title: "SMS",
    Icon: MessageSquare,
    color: "amber",
    items: [
      { name: "Messages", href: "#" },
      { name: "Templates", href: "#" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    Icon: Package,
    color: "rose",
    items: [
      { name: "Stock Management", href: "#" },
      { name: "Warehouse", href: "#" },
    ],
  },
  {
    id: "academy",
    title: "Academy",
    Icon: GraduationCap,
    color: "indigo",
    items: [
      { name: "Event Management", href: "/academy" },
      { name: "Courses", href: "#" },
    ],
  },
];

function getDisplayName(userName?: string, email?: string): string {
  if (userName && userName.trim()) return userName.trim();
  if (!email) return "there";
  const local = email.split("@")[0];
  if (!local) return "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function DashboardHome({
  userRole,
  userEmail,
  userName,
}: {
  userRole?: string;
  userEmail?: string;
  userName?: string;
}) {
  const isBranchManager = userRole === "BRANCH_MANAGER";
  const accessibleCount = isBranchManager ? 1 : dashboards.length;
  const totalCount = dashboards.length;
  const displayName = getDisplayName(userName, userEmail);
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div className="min-h-full bg-[#fafafa]">
      <section className="px-6 pt-12 pb-6 text-center">
        <div className="text-[10px] tracking-[2px] text-brand-red font-bold uppercase mb-2">
          Welcome Back
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1.5">
          {greeting}, {displayName}
        </h1>
        <p className="text-sm text-gray-500">
          {accessibleCount} of {totalCount} modules available
          {accessibleCount < totalCount && (
            <>
              {" · "}
              <span className="text-brand-red font-semibold inline-flex items-center gap-0.5">
                Request access
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </>
          )}
        </p>
      </section>

      <main className="max-w-[1080px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboards.map((dashboard) => {
            const isLocked = isBranchManager && dashboard.id !== "hrms";
            const targetHref =
              dashboard.id === "academy"
                ? "/academy"
                : dashboard.id === "sms"
                ? "/sms"
                : `/dashboards/${dashboard.id}`;
            const palette = PALETTE[dashboard.color];

            if (isLocked) {
              return (
                <div
                  key={dashboard.id}
                  className="relative bg-white border border-gray-200 rounded-xl p-6 opacity-[0.65] hover:opacity-90 hover:shadow-sm cursor-default transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                    <dashboard.Icon className="w-6 h-6 text-gray-400" strokeWidth={2} />
                  </div>
                  <div className="font-bold text-gray-900 text-base tracking-tight">
                    {dashboard.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {dashboard.items.length} tool{dashboard.items.length !== 1 ? "s" : ""}
                  </div>
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                    <Lock className="w-2.5 h-2.5 text-gray-400" strokeWidth={2.5} />
                    <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-gray-400">
                      Locked
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={dashboard.id}
                href={targetHref}
                className={`group relative bg-white border border-gray-200 border-l-[3px] ${palette.stripe} rounded-xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${palette.hoverBorder} ${palette.hoverShadow}`}
              >
                <div className={`w-12 h-12 rounded-xl ${palette.tile} flex items-center justify-center mb-4`}>
                  <dashboard.Icon className={`w-6 h-6 ${palette.icon}`} strokeWidth={2} />
                </div>
                <div className="font-bold text-gray-900 text-base tracking-tight">
                  {dashboard.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {dashboard.items.length} tool{dashboard.items.length !== 1 ? "s" : ""}
                </div>
                <ArrowRight
                  className={`absolute top-5 right-5 w-4 h-4 ${palette.arrow} transition-transform duration-200 group-hover:translate-x-1`}
                  strokeWidth={2.5}
                />
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
