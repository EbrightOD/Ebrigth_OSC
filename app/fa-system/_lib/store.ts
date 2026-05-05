// ============================================================================
// FA System — Zustand Store
// In-memory "database" with persistence to localStorage.
// Swap out later for real API calls when backend is ready.
// ============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  FAEvent,
  Invitation,
  InvitationStatus,
  Session,
  SessionQuota,
  Student,
  User,
  BranchCode,
} from "@fa/_types";
import {
  MOCK_EVENTS,
  MOCK_INVITATIONS,
  MOCK_QUOTAS,
  MOCK_SESSIONS,
  MOCK_USERS,
} from "./mockData";

interface FAStore {
  // ------- Data -------
  users: User[];
  students: Student[];
  events: FAEvent[];
  sessions: Session[];
  quotas: SessionQuota[];
  invitations: Invitation[];

  // ------- Auth -------
  currentUserId: string | null;
  login: (userId: string) => void;
  logout: () => void;

  // ------- Student data loading (real DB) -------
  studentsLoaded: boolean;
  studentsLoading: boolean;
  studentsError: string | null;
  loadStudents: () => Promise<void>;

  // ------- Event CRUD -------
  createEvent: (ev: Omit<FAEvent, "id" | "createdAt">) => FAEvent;
  updateEvent: (id: string, patch: Partial<FAEvent>) => void;
  deleteEvent: (id: string) => void;

  // ------- Session CRUD -------
  createSession: (s: Omit<Session, "id">) => Session;
  updateSession: (id: string, patch: Partial<Session>) => void;
  deleteSession: (id: string) => void;

  // ------- Quota CRUD -------
  setQuota: (sessionId: string, branch: BranchCode, quota: number) => void;
  removeQuota: (sessionId: string, branch: BranchCode) => void;

  // ------- Invitation CRUD -------
  /** Create an invitation. Returns null if the student is already invited to
   *  the event, or (unless `allowOverQuota`) if the session has no quota for
   *  the branch or the quota is already full.
   *
   *  - `initialStatus` defaults to "invited"; pass "confirmed" for walk-ins.
   *  - `allowOverQuota` defaults to false; walk-ins set it to true so the
   *    quota check is skipped (still subject to the duplicate check). */
  inviteStudent: (args: {
    eventId: string;
    sessionId: string;
    studentId: string;
    branch: BranchCode;
    invitedBy: string;
    initialStatus?: InvitationStatus;
    allowOverQuota?: boolean;
  }) => Invitation | null;
  updateInvitationStatus: (id: string, status: InvitationStatus, by?: string) => void;
  removeInvitation: (id: string) => void;
  /** Move an invitation to a different session. Updates the invitation's
   *  sessionId and rewrites sessionOrder for both source and target. */
  moveInvitationToSession: (invitationId: string, targetSessionId: string) => void;

  // ------- Display order (per session) -------
  /** Persisted display order for the attendance roster. Keyed by sessionId,
   *  value is an array of invitation IDs in the desired display order. */
  sessionOrder: Record<string, string[]>;
  setSessionOrder: (sessionId: string, invitationIds: string[]) => void;

  // ------- Inventory packing checklist -------
  /** Per-event set of packed inventory item keys. The page builds opaque
   *  keys like `medals:sess-apr-d1-1`, `mics:G3`, `sashes:ST`,
   *  `certs:sess-apr-d1-1`, plus `<section>:buffer` for the walk-in buffer
   *  rows. Stored as a string[] (not a Set) so it round-trips through JSON
   *  for the persist middleware. */
  packedItems: Record<string, string[]>;
  togglePackedItem: (eventId: string, itemKey: string) => void;
  /** Per-event walk-in buffer — extras to pack per grade (G1–G8) in case
   *  unannounced students show up. Stored as { [grade]: count }. Missing
   *  entries / events default to 0. */
  walkInBuffer: Record<string, Record<number, number>>;
  setWalkInBufferForGrade: (eventId: string, grade: number, n: number) => void;

  // ------- Utilities -------
  resetToSeed: () => void;
}

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export const useFAStore = create<FAStore>()(
  persist(
    (set, get) => ({
      users: MOCK_USERS,
      students: [],
      events: MOCK_EVENTS,
      sessions: MOCK_SESSIONS,
      quotas: MOCK_QUOTAS,
      invitations: MOCK_INVITATIONS,
      sessionOrder: {},
      packedItems: {},
      walkInBuffer: {},
      currentUserId: null,
      studentsLoaded: false,
      studentsLoading: false,
      studentsError: null,

      login: (userId) => set({ currentUserId: userId }),
      logout: () => set({ currentUserId: null }),

      loadStudents: async () => {
        if (get().studentsLoading) return;
        set({ studentsLoading: true, studentsError: null });
        try {
          const res = await fetch("/api/fa/students", { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as { students: Student[] };
          set({
            students: data.students,
            studentsLoaded: true,
            studentsLoading: false,
          });
        } catch (err) {
          set({
            studentsError: err instanceof Error ? err.message : "Unknown error",
            studentsLoading: false,
          });
        }
      },

      // ------- Events -------
      createEvent: (ev) => {
        const newEvent: FAEvent = {
          ...ev,
          id: id("e"),
          createdAt: new Date().toISOString(),
        };
        set(s => ({ events: [...s.events, newEvent] }));
        return newEvent;
      },
      updateEvent: (id, patch) => {
        set(s => ({
          events: s.events.map(e => (e.id === id ? { ...e, ...patch } : e)),
        }));
      },
      deleteEvent: (id) => {
        // Cascade: delete event → its sessions → their quotas → invitations
        const sessionIds = get().sessions.filter(s => s.eventId === id).map(s => s.id);
        set(s => ({
          events: s.events.filter(e => e.id !== id),
          sessions: s.sessions.filter(ss => ss.eventId !== id),
          quotas: s.quotas.filter(q => !sessionIds.includes(q.sessionId)),
          invitations: s.invitations.filter(i => i.eventId !== id),
        }));
      },

      // ------- Sessions -------
      createSession: (sess) => {
        const newSession: Session = { ...sess, id: id("sess") };
        set(s => ({ sessions: [...s.sessions, newSession] }));
        return newSession;
      },
      updateSession: (id, patch) => {
        set(s => ({
          sessions: s.sessions.map(ss => (ss.id === id ? { ...ss, ...patch } : ss)),
        }));
      },
      deleteSession: (id) => {
        set(s => ({
          sessions: s.sessions.filter(ss => ss.id !== id),
          quotas: s.quotas.filter(q => q.sessionId !== id),
          invitations: s.invitations.filter(i => i.sessionId !== id),
        }));
      },

      // ------- Quotas -------
      setQuota: (sessionId, branch, quota) => {
        const existing = get().quotas.find(q => q.sessionId === sessionId && q.branch === branch);
        if (existing) {
          if (quota <= 0) {
            set(s => ({ quotas: s.quotas.filter(q => q.id !== existing.id) }));
          } else {
            set(s => ({
              quotas: s.quotas.map(q => (q.id === existing.id ? { ...q, quota } : q)),
            }));
          }
        } else if (quota > 0) {
          const newQuota: SessionQuota = { id: id("q"), sessionId, branch, quota };
          set(s => ({ quotas: [...s.quotas, newQuota] }));
        }
      },
      removeQuota: (sessionId, branch) => {
        set(s => ({
          quotas: s.quotas.filter(q => !(q.sessionId === sessionId && q.branch === branch)),
        }));
      },

      // ------- Invitations -------
      inviteStudent: ({ eventId, sessionId, studentId, branch, invitedBy, initialStatus, allowOverQuota }) => {
        // Lock once Marketing has confirmed/closed the event. Walk-ins
        // (allowOverQuota) bypass this — they're added during the event itself
        // by Marketing/MKT and represent real attendees.
        const event = get().events.find(e => e.id === eventId);
        if (!event) return null;
        if (!allowOverQuota && (event.status === "closed" || event.status === "completed")) {
          return null;
        }

        // Prevent duplicate invites for the same student in the same event
        // (always — walk-ins included).
        const already = get().invitations.find(
          i => i.eventId === eventId && i.studentId === studentId
        );
        if (already) return null;

        // Enforce quota unless this is a walk-in (allowOverQuota === true).
        if (!allowOverQuota) {
          const quota = get().quotas.find(q => q.sessionId === sessionId && q.branch === branch);
          if (!quota) return null;
          const currentCount = get().invitations.filter(
            i => i.sessionId === sessionId && i.branch === branch
          ).length;
          if (currentCount >= quota.quota) return null;
        }

        const status: InvitationStatus = initialStatus ?? "invited";
        const now = new Date().toISOString();
        const newInv: Invitation = {
          id: id("inv"),
          eventId,
          sessionId,
          studentId,
          branch,
          status,
          invitedBy,
          invitedAt: now,
          // Walk-ins arrive in "confirmed" state — record confirmedAt so the
          // attendance UI surfaces the parent-confirmation indicator.
          ...(status === "confirmed" ? { confirmedAt: now } : {}),
        };
        set(s => ({ invitations: [...s.invitations, newInv] }));
        return newInv;
      },
      updateInvitationStatus: (id, status, by) => {
        set(s => ({
          invitations: s.invitations.map(i => {
            if (i.id !== id) return i;
            const patch: Partial<Invitation> = { status };
            if (status === "confirmed") patch.confirmedAt = new Date().toISOString();
            if (status === "attended" || status === "no_show") {
              patch.attendanceMarkedAt = new Date().toISOString();
              patch.attendanceMarkedBy = by;
            }
            return { ...i, ...patch };
          }),
        }));
      },
      removeInvitation: (id) => {
        set(s => ({
          invitations: s.invitations.filter(i => i.id !== id),
          sessionOrder: Object.fromEntries(
            Object.entries(s.sessionOrder).map(([sid, ids]) => [sid, ids.filter(x => x !== id)])
          ),
        }));
      },
      moveInvitationToSession: (invitationId, targetSessionId) => {
        set(s => {
          const inv = s.invitations.find(i => i.id === invitationId);
          if (!inv) return s;
          const sourceSessionId = inv.sessionId;
          if (sourceSessionId === targetSessionId) return s;

          const newInvitations = s.invitations.map(i =>
            i.id === invitationId ? { ...i, sessionId: targetSessionId } : i
          );

          const sourceOrder = (s.sessionOrder[sourceSessionId] ?? []).filter(x => x !== invitationId);
          const existingTarget = s.sessionOrder[targetSessionId] ?? [];
          const targetOrder = existingTarget.includes(invitationId)
            ? existingTarget
            : [...existingTarget, invitationId];

          return {
            invitations: newInvitations,
            sessionOrder: {
              ...s.sessionOrder,
              [sourceSessionId]: sourceOrder,
              [targetSessionId]: targetOrder,
            },
          };
        });
      },

      // ------- Display order -------
      setSessionOrder: (sessionId, invitationIds) => {
        set(s => ({
          sessionOrder: { ...s.sessionOrder, [sessionId]: invitationIds },
        }));
      },

      // ------- Inventory packing checklist -------
      togglePackedItem: (eventId, itemKey) => {
        set(s => {
          const current = s.packedItems[eventId] ?? [];
          const next = current.includes(itemKey)
            ? current.filter(k => k !== itemKey)
            : [...current, itemKey];
          return { packedItems: { ...s.packedItems, [eventId]: next } };
        });
      },
      setWalkInBufferForGrade: (eventId, grade, n) => {
        set(s => {
          const current = s.walkInBuffer[eventId] ?? {};
          const value = Math.max(0, Math.floor(n));
          const next = { ...current };
          if (value === 0) {
            delete next[grade];
          } else {
            next[grade] = value;
          }
          return { walkInBuffer: { ...s.walkInBuffer, [eventId]: next } };
        });
      },

      // ------- Utilities -------
      resetToSeed: () => {
        set({
          users: MOCK_USERS,
          // Students come from the real DB now — clear and re-fetch.
          students: [],
          studentsLoaded: false,
          studentsError: null,
          events: MOCK_EVENTS,
          sessions: MOCK_SESSIONS,
          quotas: MOCK_QUOTAS,
          invitations: MOCK_INVITATIONS,
          sessionOrder: {},
          packedItems: {},
          walkInBuffer: {},
          currentUserId: null,
        });
        void get().loadStudents();
      },
    }),
    {
      // Bumped from "fa-system-storage" — old key referenced mock student IDs
      // that no longer exist now that students come from the real DB.
      name: "fa-system-storage-v2",
      // Don't persist students — they come from the academy department.
      // Keep event/session/invitation data local for the demo.
      partialize: (s) => ({
        events: s.events,
        sessions: s.sessions,
        quotas: s.quotas,
        invitations: s.invitations,
        sessionOrder: s.sessionOrder,
        packedItems: s.packedItems,
        walkInBuffer: s.walkInBuffer,
        currentUserId: s.currentUserId,
      }),
    }
  )
);

// ------- Selectors -------
export const selectEventById = (id: string) => (state: FAStore) =>
  state.events.find(e => e.id === id);

export const selectSessionsForEvent = (eventId: string) => (state: FAStore) =>
  state.sessions
    .filter(s => s.eventId === eventId)
    .sort((a, b) => a.dayNumber - b.dayNumber || a.sessionNumber - b.sessionNumber);

export const selectQuotasForSession = (sessionId: string) => (state: FAStore) =>
  state.quotas.filter(q => q.sessionId === sessionId);

export const selectInvitationsForSession = (sessionId: string) => (state: FAStore) =>
  state.invitations.filter(i => i.sessionId === sessionId);

export const selectInvitationsForEvent = (eventId: string) => (state: FAStore) =>
  state.invitations.filter(i => i.eventId === eventId);

export const selectStudentsForBranch = (branch: BranchCode) => (state: FAStore) =>
  state.students.filter(s => s.branch === branch);
