import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const prizes = await prisma.prize.findMany({
      where: { campaignId: id },
      orderBy: { weight: 'desc' }
    })
    
    return NextResponse.json({ prizes })
  } catch (error) {
    console.error('Prizes fetch error:', error)
    return NextResponse.json({ error: 'Failed to load prizes' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const data = await request.json()
    
    const prize = await prisma.prize.create({
      data: {
        campaignId: id,
        name: data.name,
        weight: data.weight || 10,
        color: data.color || '#FFD700',
        couponType: data.couponType || 'percent_off',
        couponValue: data.couponValue,
        maxWins: data.maxWins,
        active: data.active ?? true,
      }
    })
    
    return NextResponse.json({ prize })
  } catch (error) {
    console.error('Prize create error:', error)
    return NextResponse.json({ error: 'Failed to create prize' }, { status: 500 })
  }
}
