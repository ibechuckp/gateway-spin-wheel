import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const data = await request.json()
    
    const prize = await prisma.prize.update({
      where: { id },
      data: {
        name: data.name,
        weight: data.weight,
        color: data.color,
        couponType: data.couponType,
        couponValue: data.couponValue,
        maxWins: data.maxWins,
        active: data.active,
      }
    })
    
    return NextResponse.json({ prize })
  } catch (error) {
    console.error('Prize update error:', error)
    return NextResponse.json({ error: 'Failed to update prize' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    await prisma.prize.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Prize delete error:', error)
    return NextResponse.json({ error: 'Failed to delete prize' }, { status: 500 })
  }
}
