'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'

interface Prize {
  id: string
  name: string
  color: string
  couponType: string
  couponValue: number | null
}

interface SpinWheelProps {
  prizes: Prize[]
  onSpin: () => Promise<{ prizeIndex: number; couponCode: string; prizeName: string } | null>
  disabled?: boolean
}

export default function SpinWheel({ prizes, onSpin, disabled }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<{ couponCode: string; prizeName: string } | null>(null)
  const controls = useAnimation()
  const wheelRef = useRef<SVGSVGElement>(null)
  
  const segmentAngle = 360 / prizes.length
  
  const spin = async () => {
    if (isSpinning || disabled) return
    
    setIsSpinning(true)
    setResult(null)
    
    // Get result from server first
    const spinResult = await onSpin()
    
    if (!spinResult) {
      setIsSpinning(false)
      return
    }
    
    // Calculate final angle to land on the winning segment
    // Prize at index 0 is at top, we need to rotate to bring it to the pointer position
    const targetSegmentCenter = spinResult.prizeIndex * segmentAngle + segmentAngle / 2
    const extraSpins = 5 * 360 // 5 full rotations for drama
    const finalRotation = extraSpins + (360 - targetSegmentCenter) + 90 // +90 to align with pointer at right
    
    // Animate
    await controls.start({
      rotate: finalRotation,
      transition: {
        duration: 5,
        ease: [0.25, 0.1, 0.25, 1], // Custom easing for realistic spin
      }
    })
    
    setResult({
      couponCode: spinResult.couponCode,
      prizeName: spinResult.prizeName,
    })
    setIsSpinning(false)
    
    // Trigger confetti
    if (typeof window !== 'undefined') {
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      })
    }
  }
  
  // Create SVG paths for wheel segments
  const createSegmentPath = (index: number) => {
    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180)
    const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180)
    const radius = 150
    const centerX = 160
    const centerY = 160
    
    const x1 = centerX + radius * Math.cos(startAngle)
    const y1 = centerY + radius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)
    
    const largeArc = segmentAngle > 180 ? 1 : 0
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }
  
  // Calculate text position for each segment
  const getTextPosition = (index: number) => {
    const angle = (index * segmentAngle + segmentAngle / 2 - 90) * (Math.PI / 180)
    const radius = 100
    const centerX = 160
    const centerY = 160
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      rotation: index * segmentAngle + segmentAngle / 2
    }
  }
  
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10">
          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-r-[25px] border-r-yellow-400 drop-shadow-lg" />
        </div>
        
        {/* Wheel */}
        <motion.svg
          ref={wheelRef}
          width="320"
          height="320"
          viewBox="0 0 320 320"
          animate={controls}
          className="drop-shadow-2xl"
        >
          {/* Outer ring */}
          <circle cx="160" cy="160" r="155" fill="none" stroke="#B8860B" strokeWidth="8" />
          
          {/* Segments */}
          {prizes.map((prize, index) => (
            <path
              key={prize.id}
              d={createSegmentPath(index)}
              fill={prize.color}
              stroke="#B8860B"
              strokeWidth="2"
            />
          ))}
          
          {/* Segment labels */}
          {prizes.map((prize, index) => {
            const pos = getTextPosition(index)
            return (
              <text
                key={`text-${prize.id}`}
                x={pos.x}
                y={pos.y}
                fill="white"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
              >
                {prize.name.length > 12 ? prize.name.substring(0, 10) + '...' : prize.name}
              </text>
            )
          })}
          
          {/* Center circle */}
          <circle cx="160" cy="160" r="25" fill="#B8860B" stroke="#FFD700" strokeWidth="4" />
          <circle cx="160" cy="160" r="15" fill="#FFD700" />
        </motion.svg>
      </div>
      
      {/* Spin Button */}
      {!result && (
        <button
          onClick={spin}
          disabled={isSpinning || disabled}
          className={`
            px-8 py-4 rounded-full text-xl font-bold uppercase tracking-wider
            transition-all duration-200 transform
            ${isSpinning || disabled
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
            }
            text-white
          `}
        >
          {isSpinning ? '🎰 Spinning...' : '🎲 SPIN NOW!'}
        </button>
      )}
      
      {/* Result Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-center shadow-2xl max-w-sm"
        >
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-2xl font-bold text-white mb-2">You Won!</h3>
          <p className="text-xl text-green-100 mb-4">{result.prizeName}</p>
          
          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-100 mb-1">Your Coupon Code:</p>
            <p className="text-2xl font-mono font-bold text-white tracking-wider">
              {result.couponCode}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(result.couponCode)}
              className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition"
            >
              📋 Copy
            </button>
            <button
              onClick={() => window.location.href = `https://gateway.market/dashboard?coupon=${result.couponCode}`}
              className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 rounded-lg text-gray-900 font-semibold transition"
            >
              🛒 Use Now
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
