import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/attendance-logs?empNo=44080014&month=4&year=2026
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empNo = searchParams.get('empNo');
    const month = searchParams.get('month');
    const year = searchParams.get('year') ?? new Date().getFullYear().toString();

    if (!empNo || !month) {
      return NextResponse.json({ error: 'empNo and month are required' }, { status: 400 });
    }

    const monthPadded = String(month).padStart(2, '0');
    // Match dates like "2026-04-*"
    const prefix = `${year}-${monthPadded}`;

    const logs = await prisma.attendanceLog.findMany({
      where: {
        empNo,
        date: { startsWith: prefix },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        empName: true,
        clockInTime: true,
        clockOutTime: true,
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('GET /api/attendance-logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance logs' }, { status: 500 });
  }
}
