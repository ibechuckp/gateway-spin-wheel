import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Generate unique coupon code
function generateCouponCode(prefix = 'GATEWAY') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No O/0, I/1, L
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${code}`
}

// Weighted random selection
function selectPrize(prizes: { id: string; weight: number; maxWins: number | null; winCount: number }[]) {
  // Filter out prizes that have reached their max wins
  const availablePrizes = prizes.filter(p => !p.maxWins || p.winCount < p.maxWins)
  
  if (availablePrizes.length === 0) {
    // Fallback to any prize if all are maxed out
    return prizes[0]
  }
  
  const totalWeight = availablePrizes.reduce((sum, p) => sum + p.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const prize of availablePrizes) {
    random -= prize.weight
    if (random <= 0) {
      return prize
    }
  }
  
  return availablePrizes[availablePrizes.length - 1]
}

export async function POST(request: NextRequest) {
  try {
    const { phone, email } = await request.json()
    
    if (!phone && !email) {
      return NextResponse.json({ error: 'Phone or email required' }, { status: 400 })
    }
    
    // Get active campaign with prizes
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
          where: { active: true }
        }
      }
    })
    
    if (!campaign || campaign.prizes.length === 0) {
      return NextResponse.json({ error: 'No active campaign or prizes' }, { status: 404 })
    }
    
    // Double-check eligibility
    const existingSpin = await prisma.spin.findFirst({
      where: {
        campaignId: campaign.id,
        OR: [
          phone ? { phone } : {},
          email ? { email } : {}
        ].filter(f => Object.keys(f).length > 0)
      }
    })
    
    if (existingSpin) {
      return NextResponse.json({ error: 'Already spun' }, { status: 400 })
    }
    
    // Select prize using weighted random
    const selectedPrize = selectPrize(campaign.prizes)
    const prizeIndex = campaign.prizes.findIndex(p => p.id === selectedPrize.id)
    
    // Generate unique coupon code
    let couponCode: string
    let attempts = 0
    do {
      couponCode = generateCouponCode()
      const existing = await prisma.coupon.findUnique({ where: { code: couponCode } })
      if (!existing) break
      attempts++
    } while (attempts < 10)
    
    // Get request metadata
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = request.headers.get('user-agent') || ''
    
    // Create spin record and coupon in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create spin
      const spin = await tx.spin.create({
        data: {
          campaignId: campaign.id,
          phone: phone || null,
          email: email || null,
          prizeId: selectedPrize.id,
          couponCode,
          ipAddress: ip,
          userAgent,
        }
      })
      
      // Create coupon
      const coupon = await tx.coupon.create({
        data: {
          code: couponCode,
          prizeId: selectedPrize.id,
          spinId: spin.id,
          phone: phone || null,
          email: email || null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      })
      
      // Increment prize win count
      await tx.prize.update({
        where: { id: selectedPrize.id },
        data: { winCount: { increment: 1 } }
      })
      
      return { spin, coupon }
    })
    
    return NextResponse.json({
      success: true,
      prizeIndex,
      prize: {
        id: selectedPrize.id,
        name: selectedPrize.name,
        couponType: selectedPrize.couponType,
        couponValue: selectedPrize.couponValue,
      },
      coupon: {
        code: result.coupon.code,
        expiresAt: result.coupon.expiresAt,
      },
      redirectUrl: campaign.redirectUrl,
    })
    
  } catch (error) {
    console.error('Spin execute error:', error)
    return NextResponse.json({ error: 'Spin failed' }, { status: 500 })
  }
}
