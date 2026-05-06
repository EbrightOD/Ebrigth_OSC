import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/crm/db'
import { isPreviewMode } from '@/lib/crm/preview-mode'
import { auth } from '@/lib/crm/auth'
import { logAudit } from '@/lib/crm/audit'

const Schema = z.object({ userId: z.string().min(1) })

/**
 * Start impersonating a target user.
 *
 * Two gates (matching /api/crm/preview/users):
 *   1. Dev preview mode — no auth required.
 *   2. Production: caller must be a super admin / agency admin. We then write
 *      an audit-log row recording "actor X impersonated target Y" for the
 *      compliance trail.
 */
export async function POST(req: NextRequest) {
  const previewBypass = isPreviewMode()

  // In production we need the caller's identity to (a) authorise and (b) log.
  const session = previewBypass
    ? null
    : await auth.api.getSession({ headers: await headers() })

  if (!previewBypass) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const elevated = await prisma.crm_user_branch.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['SUPER_ADMIN', 'AGENCY_ADMIN'] },
      },
      select: { tenantId: true },
    })
    if (!elevated) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 422 })
  }

  const user = await prisma.crm_auth_user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, name: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Audit only when triggered by an authenticated admin (not the dev bypass).
  if (session?.user?.id) {
    const callerLink = await prisma.crm_user_branch.findFirst({
      where: { userId: session.user.id },
      select: { tenantId: true },
    })
    if (callerLink) {
      void logAudit({
        tenantId: callerLink.tenantId,
        userId: session.user.id,
        action: 'IMPERSONATE',
        entity: 'crm_auth_user',
        entityId: user.id,
        meta: { targetEmail: user.email },
      })
    }
  }

  const res = NextResponse.json({ success: true, user })
  res.cookies.set('crm_preview_user', user.id, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })
  res.cookies.set('crm_preview_exit', '', { path: '/', maxAge: 0 })
  return res
}
