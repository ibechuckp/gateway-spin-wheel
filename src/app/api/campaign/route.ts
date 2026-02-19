import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get the active campaign with its prizes
    const campaign = await prisma.campaign.findFirst({
      where: {
        active: true,
        OR: [
          { expirationDate: null },
          { expirationDate: { gt: new Date() } }
        ]
      },
      include: {
        prizes: {
          where: { active: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })
    
    if (!campaign) {
      return NextResponse.json({ error: 'No active campaign' }, { status: 404 })
    }
    
    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        redirectUrl: campaign.redirectUrl
      },
      prizes: campaign.prizes.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        couponType: p.couponType,
        couponValue: p.couponValue
      }))
    })
  } catch (error) {
    console.error('Campaign fetch error:', error)
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
  }
}
