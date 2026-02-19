'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

// Sound URLs (free sounds)
const SOUNDS = {
  spin: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
}

export default function SpinWheel({ prizes, onSpin, disabled }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<{ couponCode: string; prizeName: string } | null>(null)
  const [rotation, setRotation] = useState(0)
  const controls = useAnimation()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const tickAudioRef = useRef<HTMLAudioElement | null>(null)
  
  const segmentAngle = 360 / prizes.length

  // Preload sounds
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(SOUNDS.spin)
      tickAudioRef.current = new Audio(SOUNDS.tick)
      tickAudioRef.current.volume = 0.3
    }
  }, [])

  const playSound = useCallback((type: 'spin' | 'tick' | 'win') => {
    try {
      const audio = new Audio(SOUNDS[type])
      audio.volume = type === 'tick' ? 0.2 : 0.5
      audio.play().catch(() => {})
    } catch (e) {}
  }, [])

  const triggerConfetti = useCallback(() => {
    if (typeof window !== 'undefined') {
      import('canvas-confetti').then((confetti) => {
        // First burst
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB']
        })
        
        // Side bursts
        setTimeout(() => {
          confetti.default({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFD700', '#FFA500', '#FF6347']
          })
          confetti.default({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#00CED1', '#9370DB', '#32CD32']
          })
        }, 250)
        
        // Final celebration
        setTimeout(() => {
          confetti.default({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.7 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB', '#32CD32']
          })
        }, 500)
      })
    }
  }, [])
  
  const spin = async () => {
    if (isSpinning || disabled) return
    
    setIsSpinning(true)
    setResult(null)
    playSound('spin')
    
    // Get result from server first
    const spinResult = await onSpin()
    
    if (!spinResult) {
      setIsSpinning(false)
      return
    }
    
    // Calculate final rotation
    const targetSegmentCenter = spinResult.prizeIndex * segmentAngle + segmentAngle / 2
    const extraSpins = 5 * 360
    const finalRotation = rotation + extraSpins + (360 - targetSegmentCenter) + 90
    
    // Tick sound during spin
    let tickCount = 0
    const tickInterval = setInterval(() => {
      if (tickCount < 30) {
        playSound('tick')
        tickCount++
      } else {
        clearInterval(tickInterval)
      }
    }, 100)
    
    // Animate
    await controls.start({
      rotate: finalRotation,
      transition: {
        duration: 5,
        ease: [0.2, 0.8, 0.3, 1],
      }
    })
    
    clearInterval(tickInterval)
    setRotation(finalRotation)
    
    // Play win sound and confetti
    playSound('win')
    triggerConfetti()
    
    setResult({
      couponCode: spinResult.couponCode,
      prizeName: spinResult.prizeName,
    })
    setIsSpinning(false)
  }
  
  // Create SVG paths for wheel segments
  const createSegmentPath = (index: number) => {
    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180)
    const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180)
    const radius = 145
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
    const radius = 95
    const centerX = 160
    const centerY = 160
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      rotation: index * segmentAngle + segmentAngle / 2
    }
  }
  
  return (
    <div className="flex flex-col items-center gap-8">
      {/* Glowing backdrop */}
      <div className="absolute w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
      
      {/* Wheel Container */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-full blur-lg opacity-50 animate-pulse" />
        
        {/* Decorative lights around wheel */}
        <div className="absolute -inset-6">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-3 h-3 rounded-full ${isSpinning ? 'animate-ping' : 'animate-pulse'}`}
              style={{
                backgroundColor: i % 2 === 0 ? '#FFD700' : '#FF6347',
                left: `${50 + 46 * Math.cos((i * 22.5 - 90) * Math.PI / 180)}%`,
                top: `${50 + 46 * Math.sin((i * 22.5 - 90) * Math.PI / 180)}%`,
                animationDelay: `${i * 0.1}s`,
                boxShadow: `0 0 10px ${i % 2 === 0 ? '#FFD700' : '#FF6347'}`
              }}
            />
          ))}
        </div>
        
        {/* Pointer */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20">
          <div className="relative">
            <div className="w-0 h-0 border-t-[20px] border-t-transparent border-b-[20px] border-b-transparent border-r-[35px] border-r-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
            <div className="absolute top-1/2 right-0 w-3 h-3 bg-white rounded-full -translate-y-1/2 translate-x-1" />
          </div>
        </div>
        
        {/* Wheel */}
        <motion.svg
          width="320"
          height="320"
          viewBox="0 0 320 320"
          animate={controls}
          className="relative z-10 drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.3))' }}
        >
          {/* Outer decorative ring */}
          <circle cx="160" cy="160" r="155" fill="url(#goldGradient)" />
          <circle cx="160" cy="160" r="150" fill="#1a1a2e" />
          
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFA500" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Segments */}
          {prizes.map((prize, index) => (
            <g key={prize.id}>
              <path
                d={createSegmentPath(index)}
                fill={prize.color}
                stroke="#FFD700"
                strokeWidth="2"
                filter="url(#glow)"
              />
              {/* Segment shine */}
              <path
                d={createSegmentPath(index)}
                fill="url(#segmentShine)"
                opacity="0.3"
              />
            </g>
          ))}
          
          {/* Segment shine gradient */}
          <defs>
            <linearGradient id="segmentShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Segment labels */}
          {prizes.map((prize, index) => {
            const pos = getTextPosition(index)
            return (
              <text
                key={`text-${prize.id}`}
                x={pos.x}
                y={pos.y}
                fill="white"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
                style={{ 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
                }}
              >
                {prize.name.length > 10 ? prize.name.substring(0, 9) + '...' : prize.name}
              </text>
            )
          })}
          
          {/* Center hub */}
          <circle cx="160" cy="160" r="35" fill="url(#goldGradient)" />
          <circle cx="160" cy="160" r="30" fill="#1a1a2e" />
          <circle cx="160" cy="160" r="25" fill="url(#goldGradient)" />
          <circle cx="160" cy="160" r="18" fill="#1a1a2e" />
          <text x="160" y="165" fill="#FFD700" fontSize="14" fontWeight="bold" textAnchor="middle">
            SPIN
          </text>
        </motion.svg>
      </div>
      
      {/* Spin Button */}
      {!result && (
        <motion.button
          onClick={spin}
          disabled={isSpinning || disabled}
          whileHover={{ scale: isSpinning ? 1 : 1.05 }}
          whileTap={{ scale: isSpinning ? 1 : 0.95 }}
          className={`
            relative px-12 py-5 rounded-full text-2xl font-bold uppercase tracking-wider
            transition-all duration-200 overflow-hidden
            ${isSpinning || disabled
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 hover:from-yellow-400 hover:via-orange-400 hover:to-yellow-400 shadow-[0_0_30px_rgba(255,215,0,0.5)]'
            }
            text-white
          `}
        >
          {/* Button shine effect */}
          {!isSpinning && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          )}
          <span className="relative z-10">
            {isSpinning ? '🎰 Spinning...' : '🎲 SPIN TO WIN!'}
          </span>
        </motion.button>
      )}
      
      {/* Result Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-8 rounded-3xl text-center shadow-[0_0_50px_rgba(16,185,129,0.5)] max-w-sm border-4 border-white/20"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl mb-3"
          >
            🎉
          </motion.div>
          <h3 className="text-3xl font-bold text-white mb-2">You Won!</h3>
          <p className="text-2xl text-emerald-100 mb-4 font-semibold">{result.prizeName}</p>
          
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-5">
            <p className="text-sm text-emerald-100 mb-1">Your Coupon Code:</p>
            <p className="text-3xl font-mono font-bold text-white tracking-widest">
              {result.couponCode}
            </p>
          </div>
          
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                navigator.clipboard.writeText(result.couponCode)
                playSound('tick')
              }}
              className="flex-1 px-5 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white font-semibold transition backdrop-blur"
            >
              📋 Copy Code
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = `https://gateway.market/dashboard?coupon=${result.couponCode}`}
              className="flex-1 px-5 py-3 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-gray-900 font-bold transition shadow-lg"
            >
              🛒 Use Now
            </motion.button>
          </div>
        </motion.div>
      )}
      
      {/* CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  )
}
