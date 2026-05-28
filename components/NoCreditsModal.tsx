'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Zap } from 'lucide-react'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  characters: number
  popular: boolean
  features: string[]
}

interface Pack {
  id: string
  label: string
  price: number
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
    description: 'Para creadores que están empezando',
    price: 7,
    characters: 200_000,
    popular: false,
    features: [
      '200.000 caracteres/mes (x2 con EliteLabs 2)',
      'Selección de voz completa',
      'Transcripciones y traducciones ilimitadas',
      '3 voces clonadas',
      'Audios disponibles 14 días',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'La mejor opción para creadores activos',
    price: 13,
    characters: 500_000,
    popular: true,
    features: [
      '500.000 caracteres/mes (x2 con EliteLabs 2)',
      'Selección de voz completa',
      'Transcripciones y traducciones ilimitadas',
      '10 voces clonadas',
      'Generación prioritaria',
      'Audios disponibles 30 días',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'Máximo rendimiento sin límites',
    price: 25,
    characters: 1_000_000,
    popular: false,
    features: [
      '1.000.000 caracteres/mes (x2 con EliteLabs 2)',
      'Selección de voz completa',
      'Transcripciones y traducciones ilimitadas',
      '20 voces clonadas',
      'Prioridad máxima',
      'Soporte preferente',
      'Audios disponibles 30 días',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para profesionales y equipos',
    price: 110,
    characters: 5_000_000,
    popular: false,
    features: [
      '5.000.000 caracteres/mes (x2 con EliteLabs 2)',
      'Voces clonadas ilimitadas',
      'Transcripciones y traducciones ilimitadas',
      'Traducción de audio +10%',
      'Generación prioritaria',
      'Soporte preferente',
      'Audios disponibles 90 días',
    ],
  },
]

const EXTRA_PACKS: Pack[] = [
  { id: 'credits-100k', label: '100.000 créditos', price: 5 },
  { id: 'credits-300k', label: '300.000 créditos', price: 12 },
  { id: 'credits-600k', label: '600.000 créditos', price: 19 },
  { id: 'credits-1m',   label: '1.000.000 créditos', price: 30 },
]

function annualMonthly(price: number) {
  return Math.round(price * 0.83 * 10) / 10
}

function annualTotal(price: number) {
  return Math.round(annualMonthly(price) * 12)
}

function getPlansToShow(currentPlan: string): Plan[] {
  const order = ['free', 'starter', 'pro', 'elite', 'enterprise']
  const currentIdx = order.indexOf(currentPlan)
  const nextIds = order.slice(currentIdx + 1)
  return ALL_PLANS.filter((p) => nextIds.includes(p.id))
}

function FeatureTick() {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginTop: '2px',
    }}>
      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function NoCreditsModal({ isOpen, onClose, currentPlan }: NoCreditsModalProps) {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  const [hoveredPack, setHoveredPack] = useState<string | null>(null)
  const plansToShow = getPlansToShow(currentPlan)

  if (!isOpen) return null

  function handlePlan(planId: string) {
    onClose()
    router.push(`/checkout/${planId}?billing=${billing}`)
  }

  function handlePack(packId: string) {
    onClose()
    router.push(`/checkout/${packId}`)
  }

  const gridCols =
    plansToShow.length === 1 ? 'repeat(1, minmax(0, 380px))' :
    plansToShow.length === 2 ? 'repeat(2, 1fr)' :
    plansToShow.length === 3 ? 'repeat(3, 1fr)' :
    'repeat(4, 1fr)'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose} />

      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: '#000000', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: '#000000', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              <h2 className="text-base font-semibold text-white">Sin créditos disponibles</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#555555' }}>
              {currentPlan === 'free'
                ? 'Elige un plan para continuar generando audio con IA'
                : 'Actualiza tu plan o añade créditos extra para continuar'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Billing toggle */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              position: 'relative', display: 'inline-grid', gridTemplateColumns: '1fr 1fr',
              background: '#000000', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '3px',
            }}>
              <div style={{
                position: 'absolute', top: '3px', left: '3px',
                width: 'calc(50% - 3px)', height: 'calc(100% - 6px)',
                background: '#ffffff', borderRadius: '7px',
                pointerEvents: 'none', transition: 'transform 0.2s ease',
                transform: `translateX(${billing === 'annual' ? '100%' : '0%'})`,
              }} />
              <button
                onClick={() => setBilling('monthly')}
                style={{
                  position: 'relative', zIndex: 1, padding: '7px 24px',
                  borderRadius: '7px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, background: 'transparent',
                  color: billing === 'monthly' ? '#000000' : '#666666',
                  transition: 'color 0.2s ease',
                }}
              >
                Mensual
              </button>
              <button
                onClick={() => setBilling('annual')}
                style={{
                  position: 'relative', zIndex: 1, padding: '7px 24px',
                  borderRadius: '7px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, background: 'transparent',
                  color: billing === 'annual' ? '#000000' : '#666666',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  transition: 'color 0.2s ease',
                }}
              >
                Anual
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 5px',
                  borderRadius: '999px',
                  background: billing === 'annual' ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.15)',
                  color: '#22c55e', whiteSpace: 'nowrap',
                }}>
                  −17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          {plansToShow.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '8px', alignItems: 'start', justifyContent: plansToShow.length === 1 ? 'center' : undefined }}>
              {plansToShow.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    borderRadius: '16px', padding: '20px 14px 16px',
                    border: plan.popular ? '1px solid rgba(255,255,255,0.2)' : '1px solid #1a1a1a',
                    background: '#0a0a0a',
                    display: 'flex', flexDirection: 'column', position: 'relative',
                  }}
                >
                  {/* Name + badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{plan.name}</span>
                    {plan.popular && (
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff',
                        background: 'rgba(255,255,255,0.05)', whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        Popular
                      </span>
                    )}
                    {plan.id === 'enterprise' && (
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                        border: '1px solid rgba(16,185,129,0.45)', color: '#6ee7b7',
                        background: 'rgba(16,185,129,0.05)', whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        Equipos
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: '12px', color: '#555555', marginBottom: '14px', lineHeight: 1.4 }}>
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div style={{ marginBottom: '14px', minHeight: '52px' }}>
                    {billing === 'annual' && (
                      <p style={{ fontSize: '12px', color: '#444444', textDecoration: 'line-through', lineHeight: 1, marginBottom: '1px' }}>
                        ${plan.price}/mes
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                      <span style={{ fontSize: '34px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                        ${billing === 'annual' ? annualMonthly(plan.price) : plan.price}
                      </span>
                      <span style={{ fontSize: '12px', color: '#444444', marginLeft: '2px' }}>/mes</span>
                    </div>
                    {billing === 'annual' && (
                      <p style={{ fontSize: '11px', color: '#555555', marginTop: '2px' }}>
                        ${annualTotal(plan.price)} facturado anualmente
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handlePlan(plan.id)}
                    onMouseEnter={() => setHoveredPlan(plan.id)}
                    onMouseLeave={() => setHoveredPlan(null)}
                    style={{
                      width: '100%', padding: '9px', borderRadius: '8px',
                      border: plan.popular ? 'none' : '1px solid #333333',
                      cursor: 'pointer',
                      background: plan.popular
                        ? (hoveredPlan === plan.id ? '#e5e5e5' : '#ffffff')
                        : (hoveredPlan === plan.id ? '#222222' : '#1a1a1a'),
                      color: plan.popular ? '#000000' : '#e5e7eb',
                      fontSize: '13px', fontWeight: 600, marginBottom: '14px',
                      transition: 'all 0.15s',
                    }}
                  >
                    Elegir {plan.name}
                  </button>

                  {/* Divider */}
                  <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '12px' }} />

                  {/* Features */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {plan.features.map((f, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '8px',
                          fontSize: '12px', lineHeight: 1.5, color: 'rgba(255,255,255,0.75)',
                          paddingTop: '8px', paddingBottom: '8px',
                          borderBottom: i < plan.features.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        }}
                      >
                        <FeatureTick />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Footer — character count */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.50)' }}>
                      {plan.characters.toLocaleString('es-ES')} caracteres/mes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '12px', color: '#444444', whiteSpace: 'nowrap' }}>o añade créditos extra</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Credit packs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {EXTRA_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => handlePack(pack.id)}
                onMouseEnter={() => setHoveredPack(pack.id)}
                onMouseLeave={() => setHoveredPack(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '14px 10px', borderRadius: '12px',
                  border: `1px solid ${hoveredPack === pack.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                  background: hoveredPack === pack.id ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{pack.label}</span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>${pack.price}</span>
                <span style={{ fontSize: '11px', color: '#555555', marginTop: '4px' }}>Añadir ahora →</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
