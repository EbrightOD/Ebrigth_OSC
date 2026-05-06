import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/crm/db'
import { isPreviewMode } from '@/lib/crm/preview-mode'
import { auth } from '@/lib/crm/auth'

/**
 * Lists all crm_auth_users that can be impersonated.
 *
 * Two gates:
 *   1. Dev preview mode (CRM_PREVIEW_MODE=true and NODE_ENV != production) —
 *      no auth required, useful for local testing.
 *   2. Production: caller must have SUPER_ADMIN or AGENCY_ADMIN role on at
 *      least one branch. The role check goes through crm_user_branch — the
 *      same source of truth used everywhere else for "elevated" privilege.
 */
async function callerIsSuperAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return false
  const link = await prisma.crm_user_branch.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ['SUPER_ADMIN', 'AGENCY_ADMIN'] },
    },
    select: { id: true },
  })
  return !!link
}

export async function GET() {
  if (!isPreviewMode() && !(await callerIsSuperAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.crm_auth_user.findMany({
    orderBy: { email: 'asc' },
    select: { id: true, email: true, name: true },
    take: 100,
  })

  // Enrich with tkt role for easier identification
  const ids = users.map((u) => u.id)
  const tktProfiles = await prisma.tkt_user_profile.findMany({
    where: { user_id: { in: ids } },
    select: { user_id: true, role: true },
  })
  const crmBranches = await prisma.crm_user_branch.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, role: true },
  })

  const tktMap = new Map(tktProfiles.map((p) => [p.user_id, p.role]))
  const crmMap = new Map(crmBranches.map((b) => [b.userId, b.role]))

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      tktRole: tktMap.get(u.id) ?? null,
      crmRole: crmMap.get(u.id) ?? null,
    })),
  )
}
