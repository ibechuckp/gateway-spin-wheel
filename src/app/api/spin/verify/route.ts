import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Normalize phone number to digits only
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10) // Last 10 digits
}

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
    
    // Check if phone is whitelisted (if campaign requires it)
    if (campaign.requireWhitelist && phone) {
      const normalizedPhone = normalizePhone(phone)
      const isWhitelisted = await prisma.allowedPhone.findFirst({
        where: {
          campaignId: campaign.id,
          phone: normalizedPhone
        }
      })
      
      if (!isWhitelisted) {
        return NextResponse.json({ 
          eligible: false, 
          message: 'This phone number is not eligible for this promotion.' 
        })
      }
    }
    
    // Check if already spun
    const existingSpin = await prisma.spin.findFirst({
      where: {
        campaignId: campaign.id,
        OR: [
          phone ? { phone: normalizePhone(phone) } : {},
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
