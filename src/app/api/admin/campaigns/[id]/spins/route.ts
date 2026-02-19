import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const [spins, total] = await Promise.all([
      prisma.spin.findMany({
        where: { campaignId },
        include: {
          prize: {
            select: { id: true, name: true, color: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.spin.count({ where: { campaignId } })
    ])

    return NextResponse.json({
      spins: spins.map(s => ({
        id: s.id,
        phone: s.phone,
        prizeName: s.prize.name,
        prizeColor: s.prize.color,
        couponCode: s.couponCode,
        redeemed: s.redeemed,
        redeemedAt: s.redeemedAt,
        createdAt: s.createdAt,
        ipAddress: s.ipAddress,
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Failed to load spins:', error)
    return NextResponse.json({ error: 'Failed to load spins' }, { status: 500 })
  }
}
