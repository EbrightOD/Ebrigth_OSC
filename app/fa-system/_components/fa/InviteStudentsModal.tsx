"use client";

import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";
import { useFAStore } from "@fa/_lib/store";
import { useCurrentUser } from "@fa/_hooks/useCurrentUser";
import { Modal } from "@fa/_components/shared/Modal";
import { StatusPill } from "@fa/_components/fa/StatusPill";
import { AgeCategory, Invitation, Session, isStudentEligible, hasBacklog } from "@fa/_types";

export function InviteStudentsModal({
  open, onClose, session, quota, currentInvitations, allInvitationsForEvent, onInvite,
}: {
  open: boolean;
  onClose: () => void;
  session: Session;
  quota: number;
  currentInvitations: Invitation[];
  allInvitationsForEvent: Invitation[];
  onInvite: (studentIds: string[]) => void;
}) {
  const user = useCurrentUser();
  const allStudents = useFAStore(s => s.students);
  const students = useMemo(
    () => allStudents.filter(st => st.branch === user?.branch),
    [allStudents, user?.branch]
  );

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<"eligible" | "all">("eligible");
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");

  const remaining = quota - currentInvitations.length;
  // Already invited anywhere in this event
  const alreadyInEvent = new Set(allInvitationsForEvent.map(i => i.studentId));

  // Filter & sort
  const visibleStudents = useMemo(() => {
    let list = students.filter(s => s.active);
    if (filterMode === "eligible") list = list.filter(s => isStudentEligible(s));
    if (gradeFilter !== "all") list = list.filter(s => s.grade === gradeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        s => s.name.toLowerCase().includes(q) ||
             s.id.toLowerCase().includes(q)
      );
    }
    // Sort: eligible first, then by name
    return list.sort((a, b) => {
      const ae = isStudentEligible(a) ? 0 : 1;
      const be = isStudentEligible(b) ? 0 : 1;
      if (ae !== be) return ae - be;
      return a.name.localeCompare(b.name);
    });
  }, [students, search, filterMode, gradeFilter]);

  function toggleStudent(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= remaining) return prev; // don't allow over-selection
        next.add(id);
      }
      return next;
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invite students — Day ${session.dayNumber} Session ${session.sessionNumber}`}
      description={`${session.startTime}–${session.endTime}${session.label ? ` · ${session.label}` : ""} · ${remaining} slot${remaining !== 1 ? "s" : ""} open`}
      size="xl"
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-ivory-300">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            className="fa-input fa-input-icon-left"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="fa-input w-32"
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          aria-label="Filter by grade"
        >
          <option value="all">All grades</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(g => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-ivory-200 p-1 rounded-lg">
          <button
            onClick={() => setFilterMode("eligible")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filterMode === "eligible" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
            }`}
          >
            Eligible only
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filterMode === "all" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
            }`}
          >
            All active
          </button>
        </div>

        <div className="text-sm text-ink-500">
          <strong className="text-ink-900">{selected.size}</strong> / {remaining} selected
        </div>
      </div>

      {/* List */}
      <div className="max-h-[50vh] overflow-y-auto">
        {visibleStudents.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-400">
            No students match.
          </div>
        ) : (
          <div className="space-y-1">
            {visibleStudents.map(student => {
              const eligible = isStudentEligible(student);
              const backlog = hasBacklog(student);
              const isChecked = selected.has(student.id);
              const alreadyInvited = alreadyInEvent.has(student.id);
              const disabled = alreadyInvited || (!isChecked && selected.size >= remaining);
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => !disabled && toggleStudent(student.id)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 p-3 rounded-[10px] border text-left transition-all ${
                    isChecked
                      ? "border-brand-600 bg-brand-50"
                      : disabled
                        ? "border-ivory-300 bg-ivory-100 opacity-60 cursor-not-allowed"
                        : "border-ivory-300 bg-white hover:border-ink-300 hover:bg-ivory-100/60"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isChecked ? "border-brand-600 bg-brand-600" : "border-ink-200 bg-white"
                  }`}>
                    {isChecked && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink-900">{student.name}</span>
                      <CategoryBadge category={student.ageCategory} />
                      <span className="font-mono text-xs text-ink-400">G{student.grade}·C{student.credit}</span>
                      {eligible && !alreadyInvited && (
                        <StatusPill tone="success" showDot={false}>Eligible</StatusPill>
                      )}
                      {!eligible && (
                        <StatusPill tone="neutral" showDot={false}>Credit {student.credit}/11</StatusPill>
                      )}
                      {backlog && (
                        <StatusPill tone="warning" showDot={false}>Has backlog</StatusPill>
                      )}
                      {alreadyInvited && (
                        <StatusPill tone="info" showDot={false}>Already invited</StatusPill>
                      )}
                    </div>
                    <div className="text-xs text-ink-400 mt-1 flex items-center gap-2">
                      <span>{student.parentName}</span>
                      <span>·</span>
                      <span className="font-mono">{student.parentPhone}</span>
                    </div>
                    {/* Backlog detail */}
                    {backlog && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {Array.from({ length: student.grade - 1 }, (_, i) => i + 1).map(g => {
                          const done = student.faHistory[g] === true;
                          return (
                            <span
                              key={g}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                done ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                              }`}
                              title={`Grade ${g}: ${done ? "completed" : "missed"}`}
                            >
                              G{g} {done ? "✓" : "✗"}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-ivory-300">
        <div className="text-xs text-ink-400">
          Showing <strong className="text-ink-600">{visibleStudents.length}</strong> student{visibleStudents.length !== 1 ? "s" : ""}
          {filterMode === "eligible" && <> with credit 10–11 (eligible)</>}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="fa-btn-secondary">Cancel</button>
          <button
            onClick={() => onInvite(Array.from(selected))}
            disabled={selected.size === 0}
            className="fa-btn-primary"
          >
            Invite {selected.size > 0 && `${selected.size} student${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Pill colors per spec: Junior blue, Middler amber, Senior gold.
function CategoryBadge({ category }: { category: AgeCategory }) {
  const cls =
    category === "Junior"  ? "bg-info-soft text-info" :
    category === "Middler" ? "bg-warning-soft text-warning" :
                              "bg-gold-100 text-gold-700";
  return <span className={`fa-pill ${cls}`}>{category}</span>;
}
