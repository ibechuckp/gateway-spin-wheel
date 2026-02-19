'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  slug: string
  active: boolean
  redirectUrl: string
  expirationDate: string | null
  _count: { spins: number }
}

interface Prize {
  id: string
  name: string
  weight: number
  color: string
  couponType: string
  couponValue: number | null
  maxWins: number | null
  winCount: number
  active: boolean
}

interface Stats {
  totalSpins: number
  uniqueUsers: number
  couponsRedeemed: number
  redemptionRate: number
  prizeDistribution: { name: string; count: number; percentage: number }[]
}

export default function AdminDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'prizes' | 'spins' | 'games'>('overview')
  
  // Prize editing
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null)
  const [newPrize, setNewPrize] = useState({
    name: '',
    weight: 10,
    color: '#FFD700',
    couponType: 'percent_off',
    couponValue: 10,
    maxWins: null as number | null,
  })

  useEffect(() => {
    loadCampaigns()
  }, [])

  useEffect(() => {
    if (selectedCampaign) {
      loadPrizes(selectedCampaign)
      loadStats(selectedCampaign)
    }
  }, [selectedCampaign])

  async function loadCampaigns() {
    try {
      const res = await fetch('/api/admin/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
      if (data.campaigns?.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data.campaigns[0].id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadPrizes(campaignId: string) {
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/prizes`)
      const data = await res.json()
      setPrizes(data.prizes || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadStats(campaignId: string) {
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/stats`)
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error(e)
    }
  }

  async function updatePrize(prize: Prize) {
    try {
      await fetch(`/api/admin/prizes/${prize.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prize)
      })
      loadPrizes(selectedCampaign!)
      setEditingPrize(null)
    } catch (e) {
      console.error(e)
    }
  }

  async function addPrize() {
    if (!newPrize.name || !selectedCampaign) return
    try {
      await fetch(`/api/admin/campaigns/${selectedCampaign}/prizes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrize)
      })
      loadPrizes(selectedCampaign)
      setNewPrize({ name: '', weight: 10, color: '#FFD700', couponType: 'percent_off', couponValue: 10, maxWins: null })
    } catch (e) {
      console.error(e)
    }
  }

  async function deletePrize(prizeId: string) {
    if (!confirm('Delete this prize?')) return
    try {
      await fetch(`/api/admin/prizes/${prizeId}`, { method: 'DELETE' })
      loadPrizes(selectedCampaign!)
    } catch (e) {
      console.error(e)
    }
  }

  const totalWeight = prizes.reduce((sum, p) => sum + (p.active ? p.weight : 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">🎰 Spin Wheel Admin</h1>
            <select
              value={selectedCampaign || ''}
              onChange={e => setSelectedCampaign(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Link href="/" className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700">
            View Wheel →
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-6">
        <div className="flex gap-1">
          {(['overview', 'prizes', 'spins', 'games'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium capitalize transition ${
                activeTab === tab
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'overview' && '📊 '}
              {tab === 'prizes' && '🎁 '}
              {tab === 'spins' && '🔄 '}
              {tab === 'games' && '🎮 '}
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="p-6 max-w-6xl mx-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <div className="text-3xl font-bold text-emerald-400">{stats.totalSpins}</div>
                <div className="text-sm text-gray-400">Total Spins</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <div className="text-3xl font-bold text-blue-400">{stats.uniqueUsers}</div>
                <div className="text-sm text-gray-400">Unique Users</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <div className="text-3xl font-bold text-purple-400">{stats.couponsRedeemed}</div>
                <div className="text-sm text-gray-400">Coupons Redeemed</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <div className="text-3xl font-bold text-yellow-400">{stats.redemptionRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-400">Redemption Rate</div>
              </div>
            </div>

            {/* Prize Distribution Chart */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="font-semibold mb-4">Prize Distribution</h3>
              <div className="space-y-3">
                {stats.prizeDistribution.map(prize => (
                  <div key={prize.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{prize.name}</span>
                      <span className="text-gray-400">{prize.count} wins ({prize.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                        style={{ width: `${prize.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Prizes Tab */}
        {activeTab === 'prizes' && (
          <div className="space-y-6">
            {/* Add Prize Form */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="font-semibold mb-4">Add New Prize</h3>
              <div className="grid grid-cols-6 gap-4">
                <input
                  type="text"
                  value={newPrize.name}
                  onChange={e => setNewPrize({ ...newPrize, name: e.target.value })}
                  placeholder="Prize name"
                  className="col-span-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
                <input
                  type="number"
                  value={newPrize.weight}
                  onChange={e => setNewPrize({ ...newPrize, weight: parseInt(e.target.value) || 0 })}
                  placeholder="Weight"
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
                <input
                  type="color"
                  value={newPrize.color}
                  onChange={e => setNewPrize({ ...newPrize, color: e.target.value })}
                  className="h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                />
                <select
                  value={newPrize.couponType}
                  onChange={e => setNewPrize({ ...newPrize, couponType: e.target.value })}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <option value="percent_off">% Off</option>
                  <option value="fixed_amount">$ Off</option>
                  <option value="free_shipping">Free Ship</option>
                </select>
                <button
                  onClick={addPrize}
                  className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Prize List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Color</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Prize</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Weight</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Probability</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Wins</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Max</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prizes.map(prize => (
                    <tr key={prize.id} className="border-t border-gray-800">
                      <td className="px-4 py-3">
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: prize.color }}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{prize.name}</td>
                      <td className="px-4 py-3">{prize.weight}</td>
                      <td className="px-4 py-3 text-emerald-400">
                        {totalWeight > 0 ? ((prize.weight / totalWeight) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="px-4 py-3">{prize.winCount}</td>
                      <td className="px-4 py-3 text-gray-400">{prize.maxWins || '∞'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          prize.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {prize.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updatePrize({ ...prize, active: !prize.active })}
                            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded"
                          >
                            {prize.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => deletePrize(prize.id)}
                            className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Spins Tab */}
        {activeTab === 'spins' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Recent Spins</h3>
              <button className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm">
                📥 Export CSV
              </button>
            </div>
            <p className="text-gray-400">Spin history will appear here...</p>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-bold mb-2">🎮 Mini Games (Coming Soon)</h3>
              <p className="text-gray-300 mb-4">
                Engage users with fun games! Players earn coupons by reaching score thresholds.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">👻</div>
                  <h4 className="font-semibold">Pac-Man Style</h4>
                  <p className="text-xs text-gray-400">Eat dots, avoid ghosts</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">🐦</div>
                  <h4 className="font-semibold">Flappy Style</h4>
                  <p className="text-xs text-gray-400">Tap to fly through pipes</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">🧱</div>
                  <h4 className="font-semibold">Brick Breaker</h4>
                  <p className="text-xs text-gray-400">Break blocks with ball</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
