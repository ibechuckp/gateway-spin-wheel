import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // Create a campaign
  const campaign = await prisma.campaign.upsert({
    where: { slug: 'gateway-launch' },
    update: {},
    create: {
      name: 'Gateway Market Launch',
      slug: 'gateway-launch',
      active: true,
      redirectUrl: 'https://gateway.market/dashboard',
      expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    }
  })
  
  console.log('Created campaign:', campaign.name)
  
  // Define prizes with colors for the wheel
  const prizeData = [
    { name: '10% Off', weight: 40, color: '#FFD700', couponType: 'percent_off', couponValue: 10 },
    { name: '$5 Off', weight: 25, color: '#FF6B6B', couponType: 'fixed_amount', couponValue: 5 },
    { name: '15% Off', weight: 15, color: '#4ECDC4', couponType: 'percent_off', couponValue: 15 },
    { name: 'Free Shipping', weight: 10, color: '#9B59B6', couponType: 'free_shipping', couponValue: null },
    { name: '$20 Off', weight: 7, color: '#3498DB', couponType: 'fixed_amount', couponValue: 20 },
    { name: '25% Off!', weight: 3, color: '#E74C3C', couponType: 'percent_off', couponValue: 25, maxWins: 50 },
  ]
  
  // Create prizes
  for (const prize of prizeData) {
    await prisma.prize.upsert({
      where: {
        id: `${campaign.id}-${prize.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      },
      update: prize,
      create: {
        id: `${campaign.id}-${prize.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        campaignId: campaign.id,
        ...prize,
      }
    })
    console.log(`  Created prize: ${prize.name} (${prize.weight}% chance)`)
  }
  
  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
