"use client";

import { useMemo } from "react";
import { Modal } from "@fa/_components/shared/Modal";
import { useFAStore } from "@fa/_lib/store";
import { StatusPill } from "@fa/_components/fa/StatusPill";
import {
  BRANCHES,
  Invitation,
  InvitationStatus,
  Session,
} from "@fa/_types";

const STATUS_TONE: Record<InvitationStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  invited: "info",
  confirmed: "success",
  attended: "success",
  declined: "danger",
  no_show: "warning",
};

const STATUS_LABEL: Record<InvitationStatus, string> = {
  invited: "Invited",
  confirmed: "Confirmed",
  attended: "Attended",
  declined: "Declined",
  no_show: "No show",
};

export function MarketingSessionInvitesModal({
  open, onClose, session,
}: {
  open: boolean;
  onClose: () => void;
  session: Session;
}) {
  const students = useFAStore(s => s.students);
  const users = useFAStore(s => s.users);
  const allInvitations = useFAStore(s => s.invitations);
  const allQuotas = useFAStore(s => s.quotas);

  const sessionInvites = useMemo(
    () => allInvitations.filter(i => i.sessionId === session.id),
    [allInvitations, session.id]
  );

  const sessionQuotas = useMemo(
    () => allQuotas.filter(q => q.sessionId === session.id),
    [allQuotas, session.id]
  );

  // Group invitations by branch. Branches with a quota but no invites still
  // show as a row so Marketing can see who hasn't started inviting yet.
  const groupedByBranch = useMemo(() => {
    const branchSet = new Set<string>();
    sessionInvites.forEach(i => branchSet.add(i.branch));
    sessionQuotas.forEach(q => branchSet.add(q.branch));
    return [...branchSet]
      .map(code => {
        const branch = BRANCHES.find(b => b.code === code);
        const invites = sessionInvites.filter(i => i.branch === code);
        const quota = sessionQuotas.find(q => q.branch === code)?.quota ?? 0;
        return { code, branch, invites, quota };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [sessionInvites, sessionQuotas]);

  const totals = {
    quota: sessionQuotas.reduce((sum, q) => sum + q.quota, 0),
    invited: sessionInvites.length,
    confirmed: sessionInvites.filter(i => i.status === "confirmed" || i.status === "attended").length,
  };

  function studentLabel(invitation: Invitation) {
    const student = students.find(s => s.id === invitation.studentId);
    if (!student) return { name: "(unknown student)", grade: null, credit: null };
    return { name: student.name, grade: student.grade, credit: student.credit };
  }

  function inviterName(userId: string) {
    return users.find(u => u.id === userId)?.name ?? userId;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Live invitations — Day ${session.dayNumber} · Session ${session.sessionNumber}`}
      description={`${session.startTime}–${session.endTime}${session.label ? ` · ${session.label}` : ""}`}
      size="xl"
    >
      <div className="flex items-center gap-6 mb-4 pb-4 border-b border-ivory-300 text-sm">
        <div>
          <span className="text-ink-400 mr-1">Total slots:</span>
          <span className="fa-mono font-semibold text-ink-900">{totals.quota}</span>
        </div>
        <div>
          <span className="text-ink-400 mr-1">Invited:</span>
          <span className="fa-mono font-semibold text-ink-900">{totals.invited}</span>
        </div>
        <div>
          <span className="text-ink-400 mr-1">Confirmed:</span>
          <span className="fa-mono font-semibold text-success">{totals.confirmed}</span>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-4">
        {groupedByBranch.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-400">
            No quotas assigned and no invitations yet.
          </div>
        ) : (
          groupedByBranch.map(({ code, branch, invites, quota }) => (
            <div key={code} className="fa-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-ink-700 bg-ivory-200 px-2 py-0.5 rounded">
                    {code}
                  </span>
                  <span className="text-sm text-ink-900">{branch?.name ?? code}</span>
                </div>
                <div className="text-xs text-ink-500">
                  <span className="fa-mono font-semibold text-ink-900">{invites.length}</span>
                  <span className="text-ink-400"> / {quota} slot{quota !== 1 ? "s" : ""}</span>
                </div>
              </div>
              {invites.length === 0 ? (
                <div className="text-xs text-ink-400 italic">
                  Branch hasn&apos;t invited anyone yet.
                </div>
              ) : (
                <div className="space-y-1">
                  {invites.map(inv => {
                    const s = studentLabel(inv);
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 text-sm py-1.5 px-2 -mx-2 rounded hover:bg-ivory-100"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-ink-900 font-medium">{s.name}</span>
                            {s.grade !== null && (
                              <span className="font-mono text-xs text-ink-400">
                                G{s.grade}·C{s.credit}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-400 mt-0.5">
                            Invited by {inviterName(inv.invitedBy)}
                          </div>
                        </div>
                        <StatusPill tone={STATUS_TONE[inv.status]} showDot={false}>
                          {STATUS_LABEL[inv.status]}
                        </StatusPill>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end pt-4 mt-4 border-t border-ivory-300">
        <button onClick={onClose} className="fa-btn-secondary">Close</button>
      </div>
    </Modal>
  );
}
