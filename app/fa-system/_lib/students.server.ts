import "server-only";
import { pool } from "./db";
import { BRANCHES, BranchCode, Student, AgeCategory } from "@fa/_types";

const BRANCH_CODES = new Set<string>(BRANCHES.map(b => b.code));

const GRADE_CHAPTER_RE = /G\s*(\d+)\s*[—–\-]\s*C\s*(\d+)/i;

function parseGradeChapter(raw: unknown): { grade: number; credit: number } | null {
  if (typeof raw !== "string") return null;
  const m = raw.match(GRADE_CHAPTER_RE);
  if (!m) return null;
  const grade = Number(m[1]);
  const credit = Number(m[2]);
  if (!Number.isFinite(grade) || !Number.isFinite(credit)) return null;
  return { grade, credit };
}

// Stopgap: derive age band from grade until DOB lands on studentrecords.
function ageCategoryFromGrade(grade: number): AgeCategory {
  if (grade <= 3) return "Junior";
  if (grade <= 6) return "Middler";
  return "Senior";
}

function parseFaHistory(raw: unknown, currentGrade: number): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  if (!Array.isArray(raw)) return out;
  // fa_progress_json is an array of booleans, index i = FA done for grade (i+1).
  // Only keep entries strictly below the student's current grade.
  for (let i = 0; i < raw.length && i < currentGrade - 1; i++) {
    out[i + 1] = raw[i] === true;
  }
  return out;
}

function toIsoDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().split("T")[0];
  if (typeof d === "string") return d.split("T")[0];
  return "";
}

interface StudentRow {
  id: number;
  name: string | null;
  status: string | null;
  branch: string | null;
  enrollment_date: Date | string | null;
  grade_chapter: string | null;
  fa_progress_json: unknown;
}

function rowToStudent(row: StudentRow): Student | null {
  if (!row.branch || !BRANCH_CODES.has(row.branch)) return null;
  const gc = parseGradeChapter(row.grade_chapter);
  if (!gc) return null;

  return {
    id: String(row.id),
    name: row.name ?? "",
    branch: row.branch as BranchCode,
    grade: gc.grade,
    ageCategory: ageCategoryFromGrade(gc.grade),
    credit: gc.credit,
    faHistory: parseFaHistory(row.fa_progress_json, gc.grade),
    // Parent contact lives in archived_students only — not in studentrecords.
    // Left blank until that data lands on the live table.
    parentName: "",
    parentPhone: "",
    enrolmentDate: toIsoDate(row.enrollment_date),
    active: (row.status ?? "").toLowerCase() === "active",
  };
}

export async function fetchAllStudents(): Promise<Student[]> {
  const { rows } = await pool.query<StudentRow>(
    `SELECT id, name, status, branch, enrollment_date, grade_chapter, fa_progress_json
       FROM studentrecords`
  );
  const students: Student[] = [];
  for (const r of rows) {
    const s = rowToStudent(r);
    if (s) students.push(s);
  }
  return students;
}
