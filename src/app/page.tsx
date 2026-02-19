'use client'

import { useState, useEffect } from 'react'
import SpinWheel from '@/components/SpinWheel'
import ExpiredPage from '@/components/ExpiredPage'

interface Prize {
  id: string
  name: string
  color: string
  couponType: string
  couponValue: number | null
}

interface CampaignData {
  campaign: {
    id: string
    name: string
    redirectUrl: string
    activeTitle: string | null
    activeSubtitle: string | null
    inactiveTitle: string | null
    inactiveMessage: string | null
  }
  prizes: Prize[]
  schedule: {
    available: boolean
    nextAvailable: string | null
  }
}

export default function SpinPage() {
  const [phone, setPhone] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null)
  const [alreadySpun, setAlreadySpun] = useState(false)
  const [scheduleAvailable, setScheduleAvailable] = useState(true)
  const [nextAvailable, setNextAvailable] = useState<string | null>(null)
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const phoneParam = params.get('phone')
    if (phoneParam) {
      setPhone(phoneParam)
    }
    loadCampaign()
  }, [])
  
  const loadCampaign = async () => {
    try {
      const res = await fetch('/api/campaign')
      const data = await res.json()
      if (data.campaign) {
        setCampaignData(data)
        // Check schedule
        if (data.schedule) {
          setScheduleAvailable(data.schedule.available)
          setNextAvailable(data.schedule.nextAvailable)
        }
      }
    } catch (e) {
      console.error('Failed to load campaign:', e)
    }
  }
  
  // Show expired page if outside scheduled hours
  if (campaignData && !scheduleAvailable) {
    return (
      <ExpiredPage 
        nextAvailable={nextAvailable}
        title={campaignData.campaign.inactiveTitle}
        message={campaignData.campaign.inactiveMessage}
      />
    )
  }
  
  const verifyPhone = async (phoneNumber: string) => {
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/spin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      })
      
      const data = await res.json()
      
      if (data.eligible) {
        setVerified(true)
        setPhone(phoneNumber)
      } else {
        if (data.message?.includes('already')) {
          setAlreadySpun(true)
        }
        setError(data.message || 'Unable to verify')
      }
    } catch (e) {
      setError('Failed to verify. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleVerify = () => {
    if (!phone.trim()) {
      setError('Please enter your phone number')
      return
    }
    verifyPhone(phone)
  }
  
  const handleSpin = async () => {
    try {
      const res = await fetch('/api/spin/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
        return null
      }
      
      return {
        prizeIndex: data.prizeIndex,
        couponCode: data.coupon.code,
        prizeName: data.prize.name
      }
    } catch (e) {
      setError('Spin failed. Please try again.')
      return null
    }
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>
      
      {/* Stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 mb-3 drop-shadow-lg">
            {campaignData?.campaign.activeTitle || '🎁 SPIN TO WIN!'}
          </h1>
          <p className="text-xl text-purple-200 font-medium">
            {campaignData?.campaign.activeSubtitle || 'Gateway Market Exclusive Rewards'}
          </p>
        </div>
        
        {!verified && !alreadySpun ? (
          // Phone Entry Form
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Enter Your Phone Number
            </h2>
            <p className="text-purple-200 text-sm mb-6 text-center">
              We'll save your prize to this number
            </p>
            
            <div className="relative mb-4">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="(555) 123-4567"
                className="w-full px-5 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white text-lg placeholder-purple-300/50 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">📱</span>
            </div>
            
            {error && (
              <p className="text-red-400 text-sm mb-4 text-center bg-red-500/10 p-3 rounded-lg">{error}</p>
            )}
            
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-xl text-gray-900 font-bold text-xl transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50"
            >
              {loading ? '⏳ Verifying...' : '🎰 Let Me Spin!'}
            </button>
          </div>
        ) : alreadySpun ? (
          // Already Spun Message
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full text-center border border-white/20 shadow-2xl">
            <div className="text-7xl mb-4">🎫</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Already Played!
            </h2>
            <p className="text-purple-200 mb-6">
              You've already spun the wheel. Check your messages for your coupon code!
            </p>
            <a
              href="https://gateway.market/dashboard"
              className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-xl text-gray-900 font-bold text-lg transition-all shadow-lg"
            >
              🛒 Shop Now →
            </a>
          </div>
        ) : campaignData ? (
          // Spin Wheel
          <SpinWheel
            prizes={campaignData.prizes}
            onSpin={handleSpin}
          />
        ) : (
          // Loading
          <div className="text-white text-xl flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-white/30 border-t-yellow-500 rounded-full animate-spin" />
            Loading...
          </div>
        )}
        
        {/* Footer */}
        <p className="text-purple-300/50 text-sm mt-8">
          One spin per customer • Prizes while supplies last
        </p>
      </div>
      
      {/* CSS animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(30px, 10px) scale(1.05); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-twinkle {
          animation: twinkle 3s infinite;
        }
      `}</style>
    </main>
  )
}
