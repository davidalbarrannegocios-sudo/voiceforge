'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Zap, Check } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price: number
  yearlyPrice: number
  credits: string
  features: string[]
  highlighted: boolean
  badge?: string
}

interface NoCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: string
}

const ALL_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 7,
    yearlyPrice: 5,
    credits: '100.000',
    highlighted: false,
    features: [
      '100.000 créditos mensuales',
      'Motor Elite Labs Pro (S2)',
      'Motor Elite Labs Legacy (S1)',
      'Historial de generaciones',
      'Descarga en MP3',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 13,
    yearlyPrice: 10,
    credits: '500.000',
    badge: 'Popular',
    highlighted: true,
    features: [
      '500.000 créditos mensuales',
      'Motor Elite Labs Pro (S2)',
      'Motor Elite Labs Legacy (S1)',
      'Motor Elite Labs Turbo',
      'Traducción de audio',
      'Clonación de voz',
      'Descarga en MP3 192kbps',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 25,
    yearlyPrice: 19,
    credits: '2.000.000',
    highlighted: false,
    features: [
      '2.000.000 créditos mensuales',
      'Todos los motores TTS',
      'Traducción de audio',
      'Clonación de voz avanzada',
      'API de acceso',
      'Soporte prioritario',
      'Descarga en WAV + MP3',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 110,
    yearlyPrice: 89,
    credits: '10.000.000',
    highlighted: false,
    features: [
      '10.000.000 créditos mensuales',
      'Todos los motores TTS',
      'API ilimitada',
      'Clonación de voz ilimitada',
      'SLA garantizado',
      'Soporte dedicado',
      'Factura personalizada',
    ],
  },
]

const EXTRA_PACKS = [
  { id: 'pack_100k', label: '100.000 créditos', price: 2 },
  { id: 'pack_500k', label: '500.000 créditos', price: 7 },
  { id: 'pack_1m',  label: '1.000.000 créditos', price: 12 },
]

function getPlansToShow(currentPlan: string): Plan[] {
  const order = ['free', 'starter', 'pro', 'elite', 'enterprise']
  const currentIdx = order.indexOf(currentPlan)
  const nextIds = order.slice(currentIdx + 1)
  return ALL_PLANS.filter((p) => nextIds.includes(p.id))
}

export function NoCreditsModal({ isOpen, onClose, currentPlan }: NoCreditsModalProps) {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const plansToShow = getPlansToShow(currentPlan)

  if (!isOpen) return null

  const extraPacksGrid = (
    <div className="grid grid-cols-3 gap-3">
      {EXTRA_PACKS.map((pack) => (
        <button
          key={pack.id}
          onClick={() => { onClose(); router.push(`/checkout/credits/${pack.id}`) }}
          className="flex flex-col items-center p-3 rounded-xl border border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/5 transition-all group"
        >
          <span className="text-sm font-semibold text-white mb-0.5">{pack.label}</span>
          <span className="text-xl font-bold text-white">${pack.price}</span>
          <span className="text-[11px] text-white/40 mt-1 group-hover:text-white/60 transition-colors">
            Añadir ahora →
          </span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/8 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="w-4 h-4 text-white/60" />
              <h2 className="text-base font-semibold text-white">Sin créditos disponibles</h2>
            </div>
            <p className="text-sm text-white/40">
              {currentPlan === 'free'
                ? 'Elige un plan para continuar generando audio con IA'
                : 'Actualiza tu plan o añade créditos extra para continuar'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Toggle mensual/anual */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/8">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billing === 'yearly' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
              >
                Anual
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${billing === 'yearly' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'}`}>
                  -25%
                </span>
              </button>
            </div>
          </div>

          {/* Grid de planes */}
          {plansToShow.length > 0 && (
            <div className={`grid gap-3 ${
              plansToShow.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
              plansToShow.length === 2 ? 'grid-cols-2' :
              plansToShow.length === 3 ? 'grid-cols-3' :
              'grid-cols-2 lg:grid-cols-4'
            }`}>
              {plansToShow.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-xl border p-4 transition-all ${plan.highlighted ? 'border-white/30 bg-white/5' : 'border-white/8 bg-white/[0.02] hover:border-white/15'}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="px-2.5 py-0.5 bg-white text-black text-[11px] font-semibold rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{plan.name}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">
                        ${billing === 'yearly' ? plan.yearlyPrice : plan.price}
                      </span>
                      <span className="text-xs text-white/40">/mes</span>
                    </div>
                    {billing === 'yearly' && (
                      <p className="text-[11px] text-white/30 mt-0.5">
                        ${plan.yearlyPrice * 12} facturado anualmente
                      </p>
                    )}
                  </div>

                  <div className="mb-3 px-2 py-1.5 bg-white/5 rounded-lg border border-white/8">
                    <p className="text-xs text-white/50 mb-0.5">Créditos mensuales</p>
                    <p className="text-sm font-semibold text-white">{plan.credits}</p>
                  </div>

                  <ul className="space-y-1.5 mb-4 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-white/50 mt-0.5 flex-shrink-0" />
                        <span className="text-[12px] text-white/60">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => { onClose(); router.push(`/checkout/${plan.id}`) }}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${plan.highlighted ? 'bg-white text-black hover:bg-white/90' : 'bg-white/8 text-white hover:bg-white/12 border border-white/10'}`}
                  >
                    Elegir {plan.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-white/30">o añade créditos extra</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {extraPacksGrid}

        </div>
      </div>
    </div>
  )
}
