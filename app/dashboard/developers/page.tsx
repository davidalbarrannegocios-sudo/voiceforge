'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Key, Plus, Trash2, Copy, Check,
  TrendingUp, Zap, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getConcurrency, formatBytes, PRICE_PER_MILLION_BYTES } from '@/lib/api-developer'

interface ApiKeyRecord {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

interface WalletData {
  bytes: number
  totalSpent: number
  dailyUsage: Record<string, number>
  monthlyBytes: number
}

const RECHARGE_OPTIONS = [
  { id: 'r18',  euros: 18,  bytes: 1_000_000,  label: '1M bytes' },
  { id: 'r54',  euros: 54,  bytes: 3_000_000,  label: '3M bytes' },
  { id: 'r180', euros: 180, bytes: 10_000_000, label: '10M bytes' },
  { id: 'r540', euros: 540, bytes: 30_000_000, label: '30M bytes' },
]

const CODE_EXAMPLES = {
  curl: `curl -X POST https://elitelabs.es/api/v1/tts \\
  -H "Authorization: Bearer el_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hola, esto es Elite Labs.",
    "voice_id": "VOICE_ID",
    "model": "elite-e2-pro"
  }' --output audio.mp3`,

  javascript: `const response = await fetch('https://elitelabs.es/api/v1/tts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer el_live_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hola, esto es Elite Labs.',
    voice_id: 'VOICE_ID',
    model: 'elite-e2-pro',
  }),
})
const audio = await response.arrayBuffer()`,

  python: `import requests

response = requests.post(
    'https://elitelabs.es/api/v1/tts',
    headers={
        'Authorization': 'Bearer el_live_YOUR_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'text': 'Hola, esto es Elite Labs.',
        'voice_id': 'VOICE_ID',
        'model': 'elite-e2-pro',
    }
)
with open('audio.mp3', 'wb') as f:
    f.write(response.content)`,
}

export default function DevelopersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [codeTab, setCodeTab] = useState<'curl' | 'javascript' | 'python'>('curl')
  const [showRecharge, setShowRecharge] = useState(false)
  const [recharging, setRecharging] = useState(false)

  useEffect(() => {
    fetchData()
    if (searchParams.get('recharge') === 'success') {
      setShowRecharge(false)
    }
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [walletRes, keysRes] = await Promise.all([
        fetch('/api/developer/wallet'),
        fetch('/api/developer/keys'),
      ])
      const walletData = await walletRes.json()
      const keysData = await keysRes.json()
      setWallet(walletData)
      setKeys(keysData.keys ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function createKey() {
    if (!newKeyName.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setCreateError(data.error)
      } else if (data.key) {
        setCreatedKey(data.key)
        setNewKeyName('')
        fetchData()
      }
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(id: string) {
    await fetch(`/api/developer/keys/${id}`, { method: 'DELETE' })
    fetchData()
  }

  async function recharge(optionId: string) {
    setRecharging(true)
    try {
      const res = await fetch('/api/developer/wallet/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
    } finally {
      setRecharging(false)
    }
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const chartData = wallet?.dailyUsage
    ? Object.entries(wallet.dailyUsage)
        .map(([date, bytes]) => ({
          date: date.slice(5),
          mb: Number((bytes / 1_000_000).toFixed(3)),
        }))
        .slice(-30)
    : []

  const concurrency = getConcurrency(wallet?.totalSpent ?? 0)

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#ffffff' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 }}>
            Panel de desarrollador
          </h1>
          <p style={{ fontSize: '13px', color: '#555555', marginTop: '4px', margin: '4px 0 0' }}>
            API de síntesis de voz · 1M bytes = {PRICE_PER_MILLION_BYTES}€
          </p>
        </div>

        {/* Recharge success banner */}
        {searchParams.get('recharge') === 'success' && (
          <div style={{
            padding: '12px 16px', borderRadius: '10px',
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Check size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#4ade80' }}>
              Recarga completada. Tu saldo ha sido actualizado.
            </span>
          </div>
        )}

        {/* Quick Start */}
        <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left */}
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px', color: '#fff' }}>
                Quick Start
              </h2>
              <p style={{ fontSize: '12px', color: '#555555', lineHeight: 1.6, margin: '0 0 16px' }}>
                Genera tu primera síntesis de voz con la API de Elite Labs.
                Reemplaza{' '}
                <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>
                  YOUR_KEY
                </code>{' '}
                con tu API key.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href="#keys"
                  style={{
                    padding: '8px 16px', background: '#ffffff', color: '#000000',
                    fontSize: '12px', fontWeight: 600, borderRadius: '8px',
                    textDecoration: 'none', display: 'inline-block',
                  }}
                >
                  Mis API keys
                </a>
                <button
                  onClick={() => setShowRecharge(true)}
                  style={{
                    padding: '8px 16px', background: 'transparent',
                    color: '#d1d5db', fontSize: '12px', fontWeight: 500,
                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  Recargar saldo
                </button>
              </div>
            </div>

            {/* Right — code */}
            <div style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {(['curl', 'javascript', 'python'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeTab(lang)}
                    style={{
                      padding: '10px 14px', fontSize: '11px', fontWeight: 600,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: codeTab === lang ? '#ffffff' : 'rgba(255,255,255,0.3)',
                      borderBottom: codeTab === lang ? '2px solid #ffffff' : '2px solid transparent',
                      transition: 'color 0.15s',
                    }}
                  >
                    {lang}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => copyText(CODE_EXAMPLES[codeTab], 'code')}
                  style={{
                    padding: '0 12px', background: 'transparent', border: 'none',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {copied === 'code'
                    ? <Check size={14} style={{ color: '#22c55e' }} />
                    : <Copy size={14} />
                  }
                </button>
              </div>
              <pre style={{
                padding: '14px', margin: 0, fontSize: '11px',
                color: 'rgba(255,255,255,0.65)', overflowX: 'auto',
                lineHeight: 1.7, fontFamily: 'monospace',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {CODE_EXAMPLES[codeTab]}
              </pre>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {/* Saldo */}
          <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: '#555555' }}>Saldo disponible</span>
              <button
                onClick={() => setShowRecharge(!showRecharge)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 10px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px',
                  fontSize: '11px', color: '#fff', cursor: 'pointer',
                }}
              >
                <RefreshCw size={10} />
                Recargar
              </button>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', margin: 0, color: '#fff' }}>
              {loading ? '—' : formatBytes(wallet?.bytes ?? 0)}
            </p>
            <p style={{ fontSize: '11px', color: '#444444', marginTop: '4px' }}>
              Total gastado: {wallet?.totalSpent?.toFixed(2) ?? '0.00'}€
            </p>
          </div>

          {/* Uso este mes */}
          <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <TrendingUp size={13} style={{ color: '#555555' }} />
              <span style={{ fontSize: '12px', color: '#555555' }}>Uso este mes</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', margin: 0, color: '#fff' }}>
              {loading ? '—' : formatBytes(wallet?.monthlyBytes ?? 0)}
            </p>
            <p style={{ fontSize: '11px', color: '#444444', marginTop: '4px' }}>
              ~{((wallet?.monthlyBytes ?? 0) / 1_000_000 * PRICE_PER_MILLION_BYTES).toFixed(2)}€ en créditos
            </p>
          </div>

          {/* Concurrencia */}
          <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <Zap size={13} style={{ color: '#555555' }} />
              <span style={{ fontSize: '12px', color: '#555555' }}>Concurrencia</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', margin: 0, color: '#fff' }}>
              {concurrency}
            </p>
            <p style={{ fontSize: '11px', color: '#444444', marginTop: '4px' }}>solicitudes simultáneas</p>
          </div>
        </div>

        {/* Recharge panel */}
        {showRecharge && (
          <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 14px' }}>
              Recargar saldo de API
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {RECHARGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => recharge(opt.id)}
                  disabled={recharging}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '14px 8px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', cursor: 'pointer',
                    opacity: recharging ? 0.6 : 1, transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#555555', marginBottom: '3px' }}>{opt.label}</span>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>{opt.euros}€</span>
                  <span style={{ fontSize: '10px', color: '#444444', marginTop: '3px' }}>
                    {(opt.bytes / 1_000_000).toFixed(0)}M bytes
                  </span>
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: '#444444', marginTop: '10px' }}>
              Pago único · Sin renovación automática · Bytes válidos indefinidamente
            </p>
          </div>
        )}

        {/* Usage chart */}
        <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 20px' }}>
            Utilización (últimos 30 días)
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="bytesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(255,255,255,0.15)" stopOpacity={1} />
                    <stop offset="95%" stopColor="rgba(255,255,255,0)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}M`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#fff', fontSize: 11,
                  }}
                  formatter={(v: unknown) => [`${v} MB`, 'TTS']}
                />
                <Area
                  type="monotone"
                  dataKey="mb"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={1.5}
                  fill="url(#bytesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '13px' }}>
              Sin datos de uso aún
            </div>
          )}
        </div>

        {/* Pricing & concurrency table */}
        <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 14px' }}>
            Concurrencia & Precios
          </h3>

          {/* Concurrency tiers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {([
              { range: '0 — 150€', slots: 3 },
              { range: '150 — 250€', slots: 10 },
              { range: '250 — 1.500€', slots: 40 },
              { range: '+3.000€', slots: 50 },
            ] as const).map((tier, i) => (
              <div key={i} style={{
                padding: '12px', borderRadius: '10px', textAlign: 'center',
                border: concurrency === tier.slots
                  ? '1px solid rgba(255,255,255,0.25)'
                  : '1px solid rgba(255,255,255,0.06)',
                background: concurrency === tier.slots
                  ? 'rgba(255,255,255,0.05)'
                  : 'transparent',
              }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>
                  {tier.slots}
                </p>
                <p style={{ fontSize: '10px', color: '#444444', margin: 0 }}>{tier.range}</p>
              </div>
            ))}
          </div>

          {/* Models table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ textAlign: 'left', padding: '0 0 10px', fontSize: '11px', color: '#444444', fontWeight: 500 }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '0 0 10px', fontSize: '11px', color: '#444444', fontWeight: 500 }}>Modelo</th>
                <th style={{ textAlign: 'right', padding: '0 0 10px', fontSize: '11px', color: '#444444', fontWeight: 500 }}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: 'TTS', model: 'elite-e2-pro', price: '18€ / millón de bytes' },
                { type: 'TTS', model: 'elite-legacy',  price: '18€ / millón de bytes' },
                { type: 'TTS', model: 'elite-turbo',   price: '18€ / millón de bytes' },
                { type: 'ASR', model: 'transcribe-1',  price: '0.36€ / hora de audio' },
              ].map((row, i, arr) => (
                <tr key={i} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '10px 0', fontSize: '11px', color: '#555555' }}>{row.type}</td>
                  <td style={{ padding: '10px 0', fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>{row.model}</td>
                  <td style={{ padding: '10px 0', fontSize: '11px', fontFamily: 'monospace', color: '#fff', textAlign: 'right' }}>{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* API Keys */}
        <div id="keys" style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 3px' }}>API Keys</h3>
            <p style={{ fontSize: '11px', color: '#444444', margin: 0 }}>
              La key se muestra una sola vez al crearla
            </p>
          </div>

          {/* New key created */}
          {createdKey && (
            <div style={{
              marginBottom: '14px', padding: '14px', borderRadius: '10px',
              background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <p style={{ fontSize: '11px', color: '#4ade80', marginBottom: '8px', fontWeight: 600 }}>
                ✓ Key creada — cópiala ahora, no volverá a mostrarse
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{
                  flex: 1, fontSize: '11px', fontFamily: 'monospace',
                  color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.05)',
                  padding: '8px 12px', borderRadius: '8px', wordBreak: 'break-all',
                }}>
                  {createdKey}
                </code>
                <button
                  onClick={() => copyText(createdKey, 'newkey')}
                  style={{
                    padding: '8px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)', border: 'none',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {copied === 'newkey'
                    ? <Check size={14} style={{ color: '#4ade80' }} />
                    : <Copy size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  }
                </button>
              </div>
              <button
                onClick={() => setCreatedKey(null)}
                style={{
                  marginTop: '8px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '11px', color: '#444444',
                  padding: 0,
                }}
              >
                Ya la copié, cerrar
              </button>
            </div>
          )}

          {/* Create key form */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createKey()}
              placeholder="Nombre de la key (ej: Producción)"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                padding: '9px 14px', fontSize: '13px', color: '#fff',
                outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <button
              onClick={createKey}
              disabled={!newKeyName.trim() || creating}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', background: '#ffffff', color: '#000000',
                fontSize: '13px', fontWeight: 600, borderRadius: '10px', border: 'none',
                cursor: !newKeyName.trim() || creating ? 'not-allowed' : 'pointer',
                opacity: !newKeyName.trim() || creating ? 0.45 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <Plus size={14} />
              Crear
            </button>
          </div>

          {createError && (
            <p style={{ fontSize: '12px', color: '#f87171', marginBottom: '10px' }}>
              {createError}
            </p>
          )}

          {/* Keys list */}
          {keys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.15)', fontSize: '13px' }}>
              No tienes API keys. Crea una para empezar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {keys.map((key) => (
                <div
                  key={key.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)', background: 'transparent',
                  }}
                >
                  <Key size={14} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff', margin: 0 }}>
                      {key.name}
                    </p>
                    <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', margin: '1px 0 0' }}>
                      {key.prefix}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '11px', color: '#444444', margin: 0 }}>
                      {key.lastUsedAt
                        ? `Usado ${new Date(key.lastUsedAt).toLocaleDateString('es-ES')}`
                        : 'Nunca usado'}
                    </p>
                    <p style={{ fontSize: '10px', color: '#333333', margin: '1px 0 0' }}>
                      Creada {new Date(key.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeKey(key.id)}
                    title="Revocar key"
                    style={{
                      padding: '6px', borderRadius: '7px', background: 'transparent',
                      border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                      e.currentTarget.style.color = '#f87171'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.2)'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
