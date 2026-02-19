import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        _count: { select: { spins: true } }
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Failed to load campaign:', error)
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    
    // Only allow updating specific fields
    const allowedFields = [
      'name', 'active', 'redirectUrl', 'expirationDate',
      'scheduleStart', 'scheduleEnd', 'timezone', 'requireWhitelist'
    ]
    
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Failed to update campaign:', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}
