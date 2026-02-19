import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Normalize phone to last 10 digits
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

/**
 * GoHighLevel Webhook
 * 
 * When GHL sends an SMS for the spin wheel campaign, 
 * call this webhook to auto-register the phone number.
 * 
 * POST /api/webhook/gohighlevel
 * 
 * Body (JSON):
 * {
 *   "phone": "+1234567890",
 *   "name": "John Doe",        // optional
 *   "campaignSlug": "gateway-launch"  // optional, defaults to active campaign
 * }
 * 
 * Or GHL format:
 * {
 *   "contact": {
 *     "phone": "+1234567890",
 *     "firstName": "John",
 *     "lastName": "Doe"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Extract phone from various formats
    let phone: string | undefined
    let name: string | undefined
    let campaignSlug: string | undefined
    
    // Direct format
    if (data.phone) {
      phone = data.phone
      name = data.name
      campaignSlug = data.campaignSlug
    }
    // GHL contact format
    else if (data.contact?.phone) {
      phone = data.contact.phone
      name = [data.contact.firstName, data.contact.lastName].filter(Boolean).join(' ') || undefined
    }
    // GHL workflow format
    else if (data.customData?.phone) {
      phone = data.customData.phone
      name = data.customData.name
      campaignSlug = data.customData.campaignSlug
    }
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }
    
    const normalizedPhone = normalizePhone(phone)
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }
    
    // Find campaign
    let campaign
    if (campaignSlug) {
      campaign = await prisma.campaign.findUnique({
        where: { slug: campaignSlug }
      })
    } else {
      // Default to first active campaign
      campaign = await prisma.campaign.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'desc' }
      })
    }
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    
    // Add to whitelist
    try {
      await prisma.allowedPhone.create({
        data: {
          campaignId: campaign.id,
          phone: normalizedPhone,
          name: name || null,
          addedVia: 'webhook'
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Phone registered for spin wheel',
        phone: normalizedPhone,
        campaign: campaign.name
      })
    } catch (e: any) {
      // Already exists
      if (e.code === 'P2002') {
        return NextResponse.json({ 
          success: true, 
          message: 'Phone already registered',
          phone: normalizedPhone
        })
      }
      throw e
    }
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Also support GET for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'Gateway Spin Wheel Webhook',
    usage: 'POST with { phone, name?, campaignSlug? }'
  })
}
