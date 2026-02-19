'use client'

import { useState, useEffect } from 'react'
import SpinWheel from '@/components/SpinWheel'

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
  }
  prizes: Prize[]
}

export default function SpinPage() {
  const [phone, setPhone] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null)
  const [alreadySpun, setAlreadySpun] = useState(false)
  
  // Get phone from URL params on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const phoneParam = params.get('phone')
    if (phoneParam) {
      setPhone(phoneParam)
      // Auto-verify if phone is in URL
      verifyPhone(phoneParam)
    }
    
    // Load campaign data
    loadCampaign()
  }, [])
  
  const loadCampaign = async () => {
    try {
      const res = await fetch('/api/campaign')
      const data = await res.json()
      if (data.campaign) {
        setCampaignData(data)
      }
    } catch (e) {
      console.error('Failed to load campaign:', e)
    }
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
        setError(data.message || 'You have already used your spin!')
        setAlreadySpun(true)
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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          🎁 Spin to Win!
        </h1>
        <p className="text-gray-300 text-lg">
          Gateway Market Exclusive Rewards
        </p>
      </div>
      
      {!verified && !alreadySpun ? (
        // Phone Verification Form
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Enter Your Phone Number
          </h2>
          <p className="text-gray-300 text-sm mb-6 text-center">
            Verify your phone to spin the wheel
          </p>
          
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          
          {error && (
            <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
          )}
          
          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 rounded-lg text-gray-900 font-bold text-lg transition disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      ) : alreadySpun ? (
        // Already Spun Message
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😅</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Already Played!
          </h2>
          <p className="text-gray-300 mb-6">
            You've already used your spin. Check your messages for your coupon code!
          </p>
          <a
            href="https://gateway.market/dashboard"
            className="inline-block px-6 py-3 bg-yellow-500 hover:bg-yellow-400 rounded-lg text-gray-900 font-bold transition"
          >
            Shop Now →
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
        <div className="text-white text-xl">Loading...</div>
      )}
      
      {/* Footer */}
      <p className="text-gray-500 text-sm mt-8">
        One spin per customer. Terms apply.
      </p>
    </main>
  )
}
