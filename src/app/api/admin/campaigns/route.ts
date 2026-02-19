import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        _count: { select: { spins: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Campaigns fetch error:', error)
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        active: data.active ?? true,
        redirectUrl: data.redirectUrl || 'https://gateway.market/dashboard',
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      }
    })
    
    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Campaign create error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
