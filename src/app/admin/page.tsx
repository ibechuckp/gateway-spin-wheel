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
  scheduleStart: string | null
  scheduleEnd: string | null
  timezone: string
  requireWhitelist: boolean
  activeTitle: string | null
  activeSubtitle: string | null
  inactiveTitle: string | null
  inactiveMessage: string | null
  _count: { spins: number }
}

interface Prize {
  id: string
  name: string
  weight: number
  color: string
  couponType: string
  couponValue: number | null
  couponCode: string | null
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
  const [activeTab, setActiveTab] = useState<'overview' | 'prizes' | 'phones' | 'spins' | 'settings' | 'games'>('overview')
  
  // Campaign settings
  const [campaignSettings, setCampaignSettings] = useState<{
    scheduleStart: string
    scheduleEnd: string
    timezone: string
    requireWhitelist: boolean
    activeTitle: string
    activeSubtitle: string
    inactiveTitle: string
    inactiveMessage: string
  }>({ 
    scheduleStart: '', 
    scheduleEnd: '', 
    timezone: 'America/New_York', 
    requireWhitelist: true,
    activeTitle: '',
    activeSubtitle: '',
    inactiveTitle: '',
    inactiveMessage: ''
  })
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Phone whitelist
  const [allowedPhones, setAllowedPhones] = useState<{ id: string; phone: string; name: string | null; addedVia: string; addedAt: string }[]>([])
  const [phonesTotal, setPhonesTotal] = useState(0)
  const [newPhone, setNewPhone] = useState('')
  const [csvInput, setCsvInput] = useState('')
  const [uploadingPhones, setUploadingPhones] = useState(false)
  
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
  
  // Spin history
  const [spins, setSpins] = useState<{
    id: string
    phone: string
    prizeName: string
    prizeColor: string
    couponCode: string
    redeemed: boolean
    redeemedAt: string | null
    createdAt: string
    ipAddress: string | null
  }[]>([])
  const [spinsTotal, setSpinsTotal] = useState(0)
  const [spinsLoading, setSpinsLoading] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [])

  useEffect(() => {
    if (selectedCampaign) {
      loadPrizes(selectedCampaign)
      loadStats(selectedCampaign)
      loadPhones(selectedCampaign)
      loadSpins(selectedCampaign)
      loadCampaignSettings(selectedCampaign)
    }
  }, [selectedCampaign, campaigns])

  async function loadPhones(campaignId: string) {
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/phones`)
      const data = await res.json()
      setAllowedPhones(data.phones || [])
      setPhonesTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    }
  }

  async function loadSpins(campaignId: string) {
    setSpinsLoading(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/spins?limit=100`)
      const data = await res.json()
      setSpins(data.spins || [])
      setSpinsTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setSpinsLoading(false)
    }
  }

  async function exportSpinsCSV() {
    if (!selectedCampaign) return
    const res = await fetch(`/api/admin/campaigns/${selectedCampaign}/spins?limit=10000`)
    const data = await res.json()
    const rows = [
      ['Date', 'Phone', 'Prize', 'Coupon Code', 'Redeemed', 'Redeemed At', 'IP Address'].join(','),
      ...data.spins.map((s: typeof spins[0]) => [
        new Date(s.createdAt).toISOString(),
        s.phone,
        s.prizeName,
        s.couponCode,
        s.redeemed ? 'Yes' : 'No',
        s.redeemedAt ? new Date(s.redeemedAt).toISOString() : '',
        s.ipAddress || ''
      ].join(','))
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spins-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function addSinglePhone() {
    if (!newPhone.trim() || !selectedCampaign) return
    try {
      await fetch(`/api/admin/campaigns/${selectedCampaign}/phones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone })
      })
      setNewPhone('')
      loadPhones(selectedCampaign)
    } catch (e) {
      console.error(e)
    }
  }

  async function uploadCSV() {
    if (!csvInput.trim() || !selectedCampaign) return
    setUploadingPhones(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${selectedCampaign}/phones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvInput })
      })
      const data = await res.json()
      alert(`Added ${data.added} phones, ${data.skipped} already existed`)
      setCsvInput('')
      loadPhones(selectedCampaign)
    } catch (e) {
      console.error(e)
      alert('Upload failed')
    } finally {
      setUploadingPhones(false)
    }
  }

  async function clearAllPhones() {
    if (!confirm('Remove ALL whitelisted phones? This cannot be undone.')) return
    if (!selectedCampaign) return
    try {
      await fetch(`/api/admin/campaigns/${selectedCampaign}/phones`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true })
      })
      loadPhones(selectedCampaign)
    } catch (e) {
      console.error(e)
    }
  }

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

  async function loadCampaignSettings(campaignId: string) {
    const campaign = campaigns.find(c => c.id === campaignId)
    if (campaign) {
      setCampaignSettings({
        scheduleStart: campaign.scheduleStart || '',
        scheduleEnd: campaign.scheduleEnd || '',
        timezone: campaign.timezone || 'America/New_York',
        requireWhitelist: campaign.requireWhitelist ?? true,
        activeTitle: campaign.activeTitle || '',
        activeSubtitle: campaign.activeSubtitle || '',
        inactiveTitle: campaign.inactiveTitle || '',
        inactiveMessage: campaign.inactiveMessage || ''
      })
    }
  }

  async function saveCampaignSettings() {
    if (!selectedCampaign) return
    setSavingSettings(true)
    try {
      await fetch(`/api/admin/campaigns/${selectedCampaign}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleStart: campaignSettings.scheduleStart || null,
          scheduleEnd: campaignSettings.scheduleEnd || null,
          timezone: campaignSettings.timezone,
          requireWhitelist: campaignSettings.requireWhitelist,
          activeTitle: campaignSettings.activeTitle || null,
          activeSubtitle: campaignSettings.activeSubtitle || null,
          inactiveTitle: campaignSettings.inactiveTitle || null,
          inactiveMessage: campaignSettings.inactiveMessage || null
        })
      })
      await loadCampaigns()
      alert('Settings saved!')
    } catch (e) {
      console.error(e)
      alert('Failed to save settings')
    } finally {
      setSavingSettings(false)
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
          {(['overview', 'prizes', 'phones', 'spins', 'settings', 'games'] as const).map(tab => (
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
              {tab === 'phones' && '📱 '}
              {tab === 'spins' && '🔄 '}
              {tab === 'settings' && '⚙️ '}
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
            {/* Edit Prize Modal */}
            {editingPrize && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 w-full max-w-md">
                  <h3 className="font-semibold text-lg mb-4">Edit Prize</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={editingPrize.name}
                        onChange={e => setEditingPrize({ ...editingPrize, name: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Weight</label>
                        <input
                          type="number"
                          value={editingPrize.weight}
                          onChange={e => setEditingPrize({ ...editingPrize, weight: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Color</label>
                        <input
                          type="color"
                          value={editingPrize.color}
                          onChange={e => setEditingPrize({ ...editingPrize, color: e.target.value })}
                          className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Coupon Type</label>
                        <select
                          value={editingPrize.couponType}
                          onChange={e => setEditingPrize({ ...editingPrize, couponType: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                        >
                          <option value="percent_off">% Off</option>
                          <option value="fixed_amount">$ Off</option>
                          <option value="free_shipping">Free Shipping</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Coupon Value</label>
                        <input
                          type="number"
                          value={editingPrize.couponValue || ''}
                          onChange={e => setEditingPrize({ ...editingPrize, couponValue: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Coupon Code</label>
                      <input
                        type="text"
                        value={editingPrize.couponCode || ''}
                        onChange={e => setEditingPrize({ ...editingPrize, couponCode: e.target.value || null })}
                        placeholder="e.g. SAVE20 (blank = auto-generate)"
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1">Everyone who wins this prize gets this exact code</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Max Wins (blank = unlimited)</label>
                      <input
                        type="number"
                        value={editingPrize.maxWins || ''}
                        onChange={e => setEditingPrize({ ...editingPrize, maxWins: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setEditingPrize(null)}
                      className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updatePrize(editingPrize)}
                      className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                            onClick={() => setEditingPrize(prize)}
                            className="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded"
                          >
                            Edit
                          </button>
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

        {/* Phones Tab */}
        {activeTab === 'phones' && (
          <div className="space-y-6">
            {/* Webhook Info */}
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-5">
              <h3 className="font-semibold text-blue-400 mb-2">🔗 GoHighLevel Webhook</h3>
              <p className="text-sm text-gray-300 mb-3">
                Auto-register phone numbers when sending SMS from GoHighLevel:
              </p>
              <code className="block bg-gray-900 p-3 rounded-lg text-sm text-green-400 break-all">
                POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/gohighlevel
              </code>
              <p className="text-xs text-gray-400 mt-2">
                Body: {'{'} "phone": "+1234567890", "name": "John Doe" {'}'}
              </p>
            </div>

            {/* Add Single Phone */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="font-semibold mb-4">Add Phone Number</h3>
              <div className="flex gap-3">
                <input
                  type="tel"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
                <button
                  onClick={addSinglePhone}
                  className="px-6 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Bulk Upload CSV */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="font-semibold mb-2">Bulk Upload (CSV)</h3>
              <p className="text-sm text-gray-400 mb-3">
                Paste phone numbers, one per line. Optional: phone,name
              </p>
              <textarea
                value={csvInput}
                onChange={e => setCsvInput(e.target.value)}
                placeholder={`+15551234567,John Doe\n+15559876543,Jane Smith\n5551112222`}
                rows={5}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm mb-3"
              />
              <button
                onClick={uploadCSV}
                disabled={uploadingPhones || !csvInput.trim()}
                className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadingPhones ? 'Uploading...' : 'Upload CSV'}
              </button>
            </div>

            {/* Phone List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold">
                  Whitelisted Phones ({phonesTotal})
                </h3>
                <button
                  onClick={clearAllPhones}
                  className="px-3 py-1 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/40"
                >
                  Clear All
                </button>
              </div>
              
              {allowedPhones.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No phones whitelisted yet. Add numbers above or use the webhook.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Phone</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Added Via</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allowedPhones.map(phone => (
                        <tr key={phone.id} className="border-t border-gray-800">
                          <td className="px-4 py-2 font-mono">{phone.phone}</td>
                          <td className="px-4 py-2 text-gray-400">{phone.name || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              phone.addedVia === 'webhook' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {phone.addedVia}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-400">
                            {new Date(phone.addedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spins Tab */}
        {activeTab === 'spins' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold">
                Spin History ({spinsTotal})
              </h3>
              <button 
                onClick={exportSpinsCSV}
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm"
              >
                📥 Export CSV
              </button>
            </div>
            
            {spinsLoading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : spins.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No spins yet. Share your wheel link to start collecting entries!
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Prize</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Coupon</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spins.map(spin => (
                      <tr key={spin.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {new Date(spin.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{spin.phone}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: spin.prizeColor }}
                            />
                            <span>{spin.prizeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-emerald-400">
                          {spin.couponCode}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            spin.redeemed 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {spin.redeemed ? 'Redeemed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                          {spin.ipAddress || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Schedule Settings */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4">⏰ Availability Schedule</h3>
              <p className="text-sm text-gray-400 mb-4">
                Set the hours when the spin wheel is available. Outside these hours, users will see an &quot;expired&quot; page.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={campaignSettings.scheduleStart}
                    onChange={e => setCampaignSettings({ ...campaignSettings, scheduleStart: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={campaignSettings.scheduleEnd}
                    onChange={e => setCampaignSettings({ ...campaignSettings, scheduleEnd: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Timezone</label>
                <select
                  value={campaignSettings.timezone}
                  onChange={e => setCampaignSettings({ ...campaignSettings, timezone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <option value="America/New_York">Eastern (New York)</option>
                  <option value="America/Chicago">Central (Chicago)</option>
                  <option value="America/Denver">Mountain (Denver)</option>
                  <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                Leave both times empty to make the wheel available 24/7.
              </p>
            </div>

            {/* Whitelist Settings */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4">📱 Phone Whitelist</h3>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={campaignSettings.requireWhitelist}
                  onChange={e => setCampaignSettings({ ...campaignSettings, requireWhitelist: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-medium">Require Phone Whitelist</span>
                  <p className="text-sm text-gray-400">Only whitelisted phone numbers can spin the wheel</p>
                </div>
              </label>
            </div>

            {/* Active Page Text */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4">✨ Active Page Text</h3>
              <p className="text-sm text-gray-400 mb-4">
                Customize the text shown when the wheel is available.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={campaignSettings.activeTitle}
                    onChange={e => setCampaignSettings({ ...campaignSettings, activeTitle: e.target.value })}
                    placeholder="🎁 SPIN TO WIN!"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={campaignSettings.activeSubtitle}
                    onChange={e => setCampaignSettings({ ...campaignSettings, activeSubtitle: e.target.value })}
                    placeholder="Gateway Market Exclusive Rewards"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Inactive Page Text */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold text-lg mb-4">🚫 Inactive Page Text</h3>
              <p className="text-sm text-gray-400 mb-4">
                Customize the text shown outside scheduled hours.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={campaignSettings.inactiveTitle}
                    onChange={e => setCampaignSettings({ ...campaignSettings, inactiveTitle: e.target.value })}
                    placeholder="This promotion has expired"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Message</label>
                  <textarea
                    value={campaignSettings.inactiveMessage}
                    onChange={e => setCampaignSettings({ ...campaignSettings, inactiveMessage: e.target.value })}
                    placeholder="Visit Gateway.Market to take advantage of our daily bouncebacks."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveCampaignSettings}
              disabled={savingSettings}
              className="w-full py-3 bg-emerald-600 rounded-lg hover:bg-emerald-700 font-semibold disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
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
