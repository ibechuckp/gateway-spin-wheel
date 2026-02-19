'use client'

import Link from 'next/link'
import Image from 'next/image'

interface ExpiredPageProps {
  nextAvailable?: string | null
  title?: string | null
  message?: string | null
}

export default function ExpiredPage({ nextAvailable, title, message }: ExpiredPageProps) {
  const displayTitle = title || 'This promotion has expired'
  const displayMessage = message || 'Visit Gateway.Market to take advantage of our daily bouncebacks.'
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Clock icon */}
        <div className="text-6xl mb-6">⏰</div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          {displayTitle}
        </h1>
        
        <p className="text-gray-300 text-lg mb-6">
          {displayMessage}
        </p>

        {nextAvailable && (
          <p className="text-gray-400 text-sm mb-8">
            Come back at <span className="text-white font-semibold">{nextAvailable}</span> for your next chance to spin!
          </p>
        )}
        
        {/* Chicken Road 2 promo */}
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 mt-8">
          <p className="text-xl text-white mb-4">
            Have you played <span className="text-yellow-400 font-bold">Chicken Road 2</span> yet?
          </p>
          <p className="text-2xl mb-4">🐔 It&apos;s soooo much fun! 🎮</p>
          
          <div className="relative rounded-xl overflow-hidden mb-4">
            <Image
              src="/images/chicken-road-2.png"
              alt="Chicken Road 2 Game"
              width={500}
              height={200}
              className="w-full h-auto"
            />
          </div>
          
          <Link
            href="https://gateway.market"
            target="_blank"
            className="inline-block px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-full hover:from-yellow-400 hover:to-orange-400 transition-all transform hover:scale-105"
          >
            Play Now at Gateway.Market →
          </Link>
        </div>
      </div>
    </div>
  )
}
