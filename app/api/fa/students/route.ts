import { NextResponse } from "next/server";
import { fetchAllStudents } from "@fa/_lib/students.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const students = await fetchAllStudents();
    return NextResponse.json({ students });
  } catch (err) {
    console.error("[/api/students] failed:", err);
    return NextResponse.json(
      { error: "Failed to load students" },
      { status: 500 }
    );
  }
}
