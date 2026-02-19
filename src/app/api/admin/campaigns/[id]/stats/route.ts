import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    // Get basic counts
    const totalSpins = await prisma.spin.count({
      where: { campaignId: id }
    })
    
    // Unique users (by phone or email)
    const uniquePhones = await prisma.spin.groupBy({
      by: ['phone'],
      where: { campaignId: id, phone: { not: null } }
    })
    const uniqueEmails = await prisma.spin.groupBy({
      by: ['email'],
      where: { campaignId: id, email: { not: null } }
    })
    const uniqueUsers = Math.max(uniquePhones.length, uniqueEmails.length)
    
    // Coupons redeemed
    const couponsRedeemed = await prisma.coupon.count({
      where: {
        prize: { campaignId: id },
        used: true
      }
    })
    
    // Prize distribution
    const prizes = await prisma.prize.findMany({
      where: { campaignId: id },
      select: {
        name: true,
        winCount: true,
      }
    })
    
    const prizeDistribution = prizes.map(p => ({
      name: p.name,
      count: p.winCount,
      percentage: totalSpins > 0 ? (p.winCount / totalSpins) * 100 : 0
    }))
    
    return NextResponse.json({
      totalSpins,
      uniqueUsers,
      couponsRedeemed,
      redemptionRate: totalSpins > 0 ? (couponsRedeemed / totalSpins) * 100 : 0,
      prizeDistribution
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
