import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { phone, email } = await request.json()
    
    if (!phone && !email) {
      return NextResponse.json({ eligible: false, message: 'Phone or email required' })
    }
    
    // Get active campaign
    const campaign = await prisma.campaign.findFirst({
      where: {
        active: true,
        OR: [
          { expirationDate: null },
          { expirationDate: { gt: new Date() } }
        ]
      }
    })
    
    if (!campaign) {
      return NextResponse.json({ eligible: false, message: 'No active campaign' })
    }
    
    // Check if already spun
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
      return NextResponse.json({ 
        eligible: false, 
        message: 'You have already used your spin for this campaign!' 
      })
    }
    
    // Check IP rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const recentSpinsFromIP = await prisma.spin.count({
      where: {
        ipAddress: ip,
        createdAt: { gt: oneHourAgo }
      }
    })
    
    if (recentSpinsFromIP >= 5) {
      return NextResponse.json({ 
        eligible: false, 
        message: 'Too many attempts. Please try again later.' 
      })
    }
    
    return NextResponse.json({ eligible: true, message: 'Ready to spin!' })
    
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ eligible: false, message: 'Verification failed' })
  }
}
