import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Normalize phone to last 10 digits
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

// GET - List allowed phones
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const phones = await prisma.allowedPhone.findMany({
      where: { campaignId: id },
      orderBy: { addedAt: 'desc' },
      take: 500 // Limit for performance
    })
    
    const total = await prisma.allowedPhone.count({
      where: { campaignId: id }
    })
    
    return NextResponse.json({ phones, total })
  } catch (error) {
    console.error('Phones fetch error:', error)
    return NextResponse.json({ error: 'Failed to load phones' }, { status: 500 })
  }
}

// POST - Add phones (single, bulk array, or CSV)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const contentType = request.headers.get('content-type') || ''
    let phonesToAdd: { phone: string; name?: string }[] = []
    
    if (contentType.includes('application/json')) {
      const data = await request.json()
      
      // Single phone
      if (data.phone) {
        phonesToAdd = [{ phone: data.phone, name: data.name }]
      }
      // Array of phones
      else if (Array.isArray(data.phones)) {
        phonesToAdd = data.phones.map((p: string | { phone: string; name?: string }) => 
          typeof p === 'string' ? { phone: p } : p
        )
      }
      // CSV content as string
      else if (data.csv) {
        phonesToAdd = parseCSV(data.csv)
      }
    }
    
    if (phonesToAdd.length === 0) {
      return NextResponse.json({ error: 'No phones provided' }, { status: 400 })
    }
    
    // Normalize and dedupe
    const normalized = phonesToAdd
      .map(p => ({
        phone: normalizePhone(p.phone),
        name: p.name || null
      }))
      .filter(p => p.phone.length >= 10)
    
    // Batch insert, skip duplicates
    let added = 0
    let skipped = 0
    
    for (const { phone, name } of normalized) {
      try {
        await prisma.allowedPhone.create({
          data: {
            campaignId: id,
            phone,
            name,
            addedVia: 'manual'
          }
        })
        added++
      } catch (e: any) {
        // Unique constraint violation = already exists
        if (e.code === 'P2002') {
          skipped++
        } else {
          throw e
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      added, 
      skipped,
      total: added + skipped 
    })
  } catch (error) {
    console.error('Phones add error:', error)
    return NextResponse.json({ error: 'Failed to add phones' }, { status: 500 })
  }
}

// DELETE - Remove all phones or specific ones
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const { phoneIds, clearAll } = await request.json()
    
    if (clearAll) {
      const result = await prisma.allowedPhone.deleteMany({
        where: { campaignId: id }
      })
      return NextResponse.json({ deleted: result.count })
    }
    
    if (phoneIds && Array.isArray(phoneIds)) {
      const result = await prisma.allowedPhone.deleteMany({
        where: { 
          campaignId: id,
          id: { in: phoneIds }
        }
      })
      return NextResponse.json({ deleted: result.count })
    }
    
    return NextResponse.json({ error: 'Specify phoneIds or clearAll' }, { status: 400 })
  } catch (error) {
    console.error('Phones delete error:', error)
    return NextResponse.json({ error: 'Failed to delete phones' }, { status: 500 })
  }
}

// Parse CSV content
function parseCSV(csv: string): { phone: string; name?: string }[] {
  const lines = csv.split('\n').filter(l => l.trim())
  const results: { phone: string; name?: string }[] = []
  
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim().replace(/"/g, ''))
    if (parts.length >= 1 && parts[0]) {
      results.push({
        phone: parts[0],
        name: parts[1] || undefined
      })
    }
  }
  
  return results
}
