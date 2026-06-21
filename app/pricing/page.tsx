"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useLang } from "@/app/dashboard/LanguageContext";

type Plan = {
  key: string;
  name: string;
  description: string;
  price: number;
  annualTotal: number;
  characters: number;
  popular: boolean;
  free: boolean;
  cta: string;
  features: string[];
};

function FeatureTick() {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: "50%",
      background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, marginTop: "2px",
    }}>
      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}

type Discount = { active: boolean; percent: number; label: string };

function PricingContent() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLang();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(2);

  function fmtChars(n: number) {
    return n.toLocaleString("es-ES");
  }

  const PLANS: Plan[] = [
    {
      key: "free",
      name: t.pricing.freePrice,
      description: t.billing.planDescFree,
      price: 0,
      annualTotal: 0,
      characters: 10_000,
      popular: false,
      free: true,
      cta: t.pricing.startFree,
      features: [
        t.billing.feat10k,
        t.billing.featRandomVoice,
        t.billing.feat2Transcriptions,
        t.billing.featNoClone,
        t.billing.featAudio72h,
      ],
    },
    {
      key: "creator",
      name: "Creator",
      description: t.billing.planDescCreator,
      price: 8,
      annualTotal: 81.60,
      characters: 250_000,
      popular: false,
      free: false,
      cta: t.pricing.subscribe,
      features: [
        t.billing.featCharsX2.replace("{n}", fmtChars(250_000)),
        t.billing.featFullVoice,
        t.billing.featUnlimitedTrans,
        t.billing.feat3Clones,
        t.billing.featAudio14d,
      ],
    },
    {
      key: "plus",
      name: "Plus",
      description: t.billing.planDescPlus,
      price: 26,
      annualTotal: 265.20,
      characters: 1_000_000,
      popular: true,
      free: false,
      cta: t.pricing.subscribe,
      features: [
        t.billing.featCharsX2.replace("{n}", fmtChars(1_000_000)),
        t.billing.featFullVoice,
        t.billing.featUnlimitedTrans,
        t.billing.feat10Clones,
        t.billing.featPriorityGen,
        t.billing.featAudio30d,
      ],
    },
    {
      key: "pro",
      name: "Pro",
      description: t.billing.planDescPro,
      price: 49,
      annualTotal: 499.80,
      characters: 2_000_000,
      popular: false,
      free: false,
      cta: t.pricing.subscribe,
      features: [
        t.billing.featCharsX2.replace("{n}", fmtChars(2_000_000)),
        t.billing.featFullVoice,
        t.billing.featUnlimitedTrans,
        t.billing.feat15Clones,
        t.billing.featPriorityGen,
        t.billing.featAudio30d,
      ],
    },
    {
      key: "elite",
      name: "Elite",
      description: t.billing.planDescElite,
      price: 315,
      annualTotal: 3213,
      characters: 15_000_000,
      popular: false,
      free: false,
      cta: t.pricing.subscribe,
      features: [
        t.billing.featCharsX2.replace("{n}", fmtChars(15_000_000)),
        t.billing.featFullVoice,
        t.billing.featUnlimitedTrans,
        t.billing.feat20Clones,
        t.billing.featTopPriority,
        t.billing.featSupport,
        t.billing.featAudio90d,
      ],
    },
  ];

  useEffect(() => {
    const planKey = searchParams.get("plan");
    if (planKey && isSignedIn && planKey !== "free") {
      router.push(`/checkout/${planKey}?billing=${billing}`);
    }
  }, [isSignedIn, searchParams]);

  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((d) => { if (d.plan) setCurrentPlan(d.plan); })
        .catch(() => {});
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setBilling("monthly");
    }
  }, [isLoaded, isSignedIn]);

  // Load discount — no auth required:
  // If ?ref= in URL: call public /api/referral/check for immediate data (also sets httpOnly cookies)
  // Otherwise: read client-readable affiliate_discount cookie set by AffiliateRefTracker
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      fetch(`/api/referral/check?code=${encodeURIComponent(refCode)}`)
        .then(r => r.json())
        .then(d => { if (d.hasDiscount) setDiscount({ active: true, percent: d.percentage, label: d.label }); })
        .catch(() => {});
    } else {
      const m = document.cookie.match(/(?:^|;\s*)affiliate_discount=([^;]*)/);
      if (m) {
        try {
          const d = JSON.parse(decodeURIComponent(m[1]));
          if (d.percentage > 0) setDiscount({ active: true, percent: d.percentage, label: d.label || t.pricing.discountLabel });
        } catch {}
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(plan: Plan) {
    if (plan.free) {
      router.push("/sign-up");
      return;
    }
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/checkout/${plan.key}?billing=${billing}`);
      return;
    }
    router.push(`/checkout/${plan.key}?billing=${billing}`);
  }

  function annualMonthly(plan: Plan) {
    if (plan.annualTotal === 0) return 0;
    return Math.round((plan.annualTotal / 12) * 100) / 100;
  }

  function effectiveMonthly(plan: Plan): number {
    const base = billing === "annual" ? annualMonthly(plan) : plan.price;
    if (!discount?.active) return base;
    return Math.round(base * (1 - discount.percent / 100) * 100) / 100;
  }
  function effectiveAnnual(plan: Plan): number {
    return Math.round(effectiveMonthly(plan) * 12 * 100) / 100;
  }
  function annualSavings(plan: Plan): number {
    return Math.round((plan.price * 12 - plan.annualTotal) * 100) / 100;
  }

  function cardBg(plan: Plan) {
    return plan.popular ? "#111111" : "#0a0a0a";
  }

  function cardBorder(plan: Plan) {
    return plan.popular ? "1px solid rgba(255,255,255,0.22)" : "1px solid #1a1a1a";
  }

  function btnStyle(plan: Plan, hovered: boolean): React.CSSProperties {
    if (plan.free) return {
      width: "100%", padding: "10px", borderRadius: "8px",
      border: "1px solid rgba(255,255,255,0.2)",
      cursor: "pointer", background: hovered ? "rgba(255,255,255,0.05)" : "transparent",
      color: "#ffffff", fontSize: "13px", fontWeight: 600, marginBottom: "16px",
      transition: "all 0.15s",
    };
    if (plan.popular) return {
      width: "100%", padding: "10px", borderRadius: "8px", border: "none",
      cursor: "pointer", background: hovered ? "#e5e5e5" : "#ffffff",
      color: "#000000", fontSize: "13px", fontWeight: 600, marginBottom: "16px",
      transition: "all 0.15s",
    };
    return {
      width: "100%", padding: "10px", borderRadius: "8px",
      border: "1px solid #333333",
      cursor: "pointer", background: hovered ? "#222222" : "#1a1a1a",
      color: "#e5e7eb", fontSize: "13px", fontWeight: 600, marginBottom: "16px",
      transition: "all 0.15s",
    };
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000000", overflowX: "hidden" }}>
      <header style={{ borderBottom: "1px solid #1a1a1a", padding: "0 16px", height: "60px", display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: "1536px", width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} className="rounded-lg" />
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>Elite Labs</span>
          </Link>
          <Link href={isSignedIn ? "/dashboard" : "/"} style={{ fontSize: "13px", color: "#555555", textDecoration: "none" }}>
            {isSignedIn ? t.pricing.backDashboard : t.pricing.backHome}
          </Link>
        </div>
      </header>

      <main className="px-4 pt-8 md:pt-14 pb-16 md:pb-20" style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "clamp(24px, 6vw, 40px)", fontWeight: 800, color: "#fff", marginBottom: "8px", lineHeight: 1.1 }}>
            {t.pricing.title}
          </h1>
          <p style={{ fontSize: "15px", color: "#555555" }}>
            {t.pricing.subtitle}
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <div style={{ position: "relative", display: "inline-grid", gridTemplateColumns: "1fr 1fr", background: "#000000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "3px", maxWidth: "100%" }}>
            <div style={{
              position: "absolute", top: "3px", left: "3px",
              width: "calc(50% - 3px)", height: "calc(100% - 6px)",
              background: "rgba(255,255,255,0.12)", borderRadius: "7px",
              pointerEvents: "none", transition: "transform 0.2s ease",
              transform: `translateX(${billing === "annual" ? "100%" : "0%"})`,
            }} />
            <button
              onClick={() => setBilling("monthly")}
              style={{ position: "relative", zIndex: 1, padding: "8px 20px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, background: "transparent", color: billing === "monthly" ? "#ffffff" : "rgba(255,255,255,0.4)", transition: "color 0.2s ease", whiteSpace: "nowrap" }}
            >
              {t.billing.monthly}
            </button>
            <button
              onClick={() => setBilling("annual")}
              style={{ position: "relative", zIndex: 1, padding: "8px 20px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, background: "transparent", color: billing === "annual" ? "#ffffff" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "color 0.2s ease", whiteSpace: "nowrap" }}
            >
              {t.billing.annual}
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 5px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#22c55e", whiteSpace: "nowrap" }}>−15%</span>
            </button>
          </div>
        </div>

        {/* Plans — mobile carousel + desktop grid */}

        {/* MOBILE CAROUSEL */}
        <div
          className="md:hidden"
          style={{ marginBottom: "48px", paddingTop: "16px" }}
        >
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              const cardWidth = el.scrollWidth / PLANS.length;
              const idx = Math.round(el.scrollLeft / cardWidth);
              setActiveCarouselIndex(idx);
            }}
            style={{
              display: "flex",
              overflowX: "scroll",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              gap: "12px",
              paddingLeft: "24px",
              paddingRight: "24px",
              paddingBottom: "8px",
            }}
          >
            {PLANS.map((plan, idx) => {
              const isActive = idx === activeCarouselIndex;
              return (
                <div
                  key={plan.key}
                  style={{
                    scrollSnapAlign: "center",
                    flexShrink: 0,
                    width: "78vw",
                    maxWidth: "300px",
                    borderRadius: "16px",
                    padding: plan.popular ? "28px 18px 20px" : "22px 16px 18px",
                    border: cardBorder(plan),
                    background: cardBg(plan),
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    transition: "opacity 0.3s ease, transform 0.3s ease",
                    opacity: isActive ? 1 : 0.45,
                    transform: isActive ? "scale(1)" : "scale(0.95)",
                  }}
                >
                  {/* Popular badge moved inline — see name row below */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>{plan.name}</span>
                      {plan.popular && !(currentPlan === plan.key && ["free","creator","plus","pro","elite"].includes(currentPlan ?? "")) && (
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", color: "#e5e7eb", whiteSpace: "nowrap" }}>
                          {t.pricing.popular}
                        </span>
                      )}
                      {billing === "annual" && !plan.free && (
                        <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "6px", background: "rgba(34,197,94,0.12)", color: "rgba(74,222,128,0.6)", whiteSpace: "nowrap" }}>
                          {t.pricing.annualSavings.replace("{n}", "$" + annualSavings(plan).toFixed(2))}
                        </span>
                      )}
                    </div>
                    {currentPlan === plan.key && ["free","creator","plus","pro","elite"].includes(currentPlan) && (
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(245,158,11,0.45)", color: "#f59e0b", background: "rgba(245,158,11,0.1)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {t.pricing.currentPlan}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: "#555555", marginBottom: "16px", lineHeight: 1.4 }}>{plan.description}</p>
                  {discount?.active && (!currentPlan || currentPlan === "free") && (
                    <div style={{ display: "inline-flex", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        {discount.label}
                      </span>
                    </div>
                  )}
                  <div style={{ marginBottom: "16px", minHeight: "62px" }}>
                    {plan.free ? (
                      <>
                        <span style={{ fontSize: "38px", fontWeight: 800, color: "#fff", lineHeight: 1, display: "block" }}>{t.pricing.freePrice}</span>
                        <p style={{ fontSize: "11px", color: "transparent", marginTop: "4px", userSelect: "none" }}>·</p>
                      </>
                    ) : (
                      <>
                        {(billing === "annual" || discount?.active) && (
                          <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.3)", textDecoration: "line-through", marginBottom: "4px", lineHeight: 1, fontWeight: 500 }}>${plan.price}{t.pricing.perMonth}</p>
                        )}
                        <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                          <span style={{ fontSize: "38px", fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>${effectiveMonthly(plan)}</span>
                          <span style={{ fontSize: "12px", color: "#444444", marginLeft: "2px" }}>{t.pricing.perMonth}</span>
                        </div>
                        {billing === "annual" ? (
                          <p style={{ fontSize: "11px", color: "#555555", marginTop: "2px" }}>${effectiveAnnual(plan)} {t.pricing.billedAnnually}</p>
                        ) : discount?.active ? (
                          <p style={{ fontSize: "11px", color: "rgba(74,222,128,0.7)", marginTop: "3px" }}>{discount.percent}{t.pricing.discountApplied}</p>
                        ) : (
                          <p style={{ fontSize: "11px", color: "transparent", marginTop: "3px", userSelect: "none" }}>·</p>
                        )}
                      </>
                    )}
                  </div>
                  <button onClick={() => handleSelect(plan)} onMouseEnter={() => setHoveredPlan(plan.key)} onMouseLeave={() => setHoveredPlan(null)} style={btnStyle(plan, hoveredPlan === plan.key)}>
                    {plan.cta}
                  </button>
                  <div style={{ height: "1px", background: "#1a1a1a", marginBottom: "14px" }} />
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                    {plan.features.map((f, i) => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.80)", paddingTop: "10px", paddingBottom: "10px", borderBottom: i < plan.features.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                        <FeatureTick />{f}
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.60)", textAlign: "center" }}>{fmtChars(plan.characters)} {t.pricing.charsPerMonth}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Dot indicators */}
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
            {PLANS.map((_, idx) => (
              <div key={idx} style={{ width: idx === activeCarouselIndex ? "18px" : "6px", height: "6px", borderRadius: "999px", background: idx === activeCarouselIndex ? "#ffffff" : "rgba(255,255,255,0.25)", transition: "all 0.3s ease" }} />
            ))}
          </div>
        </div>

        {/* DESKTOP GRID */}
        <div
          className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          style={{ gap: "14px", marginBottom: "48px", alignItems: "start", paddingTop: "16px", width: "100%" }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              style={{
                borderRadius: "16px",
                padding: plan.popular ? "28px 18px 20px" : "22px 16px 18px",
                border: cardBorder(plan),
                background: cardBg(plan),
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transition: "transform 0.15s",
              }}
            >
              {/* Popular badge moved inline — see name row below */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>{plan.name}</span>
                  {plan.popular && !(currentPlan === plan.key && ["free","creator","plus","pro","elite"].includes(currentPlan ?? "")) && (
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", color: "#e5e7eb", whiteSpace: "nowrap" }}>
                      {t.pricing.popular}
                    </span>
                  )}
                  {billing === "annual" && !plan.free && (
                    <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "6px", background: "rgba(34,197,94,0.12)", color: "rgba(74,222,128,0.6)", whiteSpace: "nowrap" }}>
                      {t.pricing.annualSavings.replace("{n}", "$" + annualSavings(plan).toFixed(2))}
                    </span>
                  )}
                </div>
                {currentPlan === plan.key && ["free","creator","plus","pro","elite"].includes(currentPlan) && (
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(245,158,11,0.45)", color: "#f59e0b", background: "rgba(245,158,11,0.1)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {t.pricing.currentPlan}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", color: "#555555", marginBottom: "16px", lineHeight: 1.4 }}>{plan.description}</p>
              {discount?.active && (!currentPlan || currentPlan === "free") && (
                <div style={{ display: "inline-flex", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {discount.label}
                  </span>
                </div>
              )}
              <div style={{ marginBottom: "16px", minHeight: "62px" }}>
                {plan.free ? (
                  <>
                    <span style={{ fontSize: "38px", fontWeight: 800, color: "#fff", lineHeight: 1, display: "block" }}>{t.pricing.freePrice}</span>
                    <p style={{ fontSize: "11px", color: "transparent", marginTop: "4px", userSelect: "none" }}>·</p>
                  </>
                ) : (
                  <>
                    {(billing === "annual" || discount?.active) && (
                      <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.3)", textDecoration: "line-through", marginBottom: "4px", lineHeight: 1 }}>${plan.price}{t.pricing.perMonth}</p>
                    )}
                    <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                      <span style={{ fontSize: "38px", fontWeight: 800, lineHeight: 1, color: "#ffffff" }}>${effectiveMonthly(plan)}</span>
                      <span style={{ fontSize: "12px", color: "#444444", marginLeft: "2px" }}>{t.pricing.perMonth}</span>
                    </div>
                    {billing === "annual" ? (
                      <p style={{ fontSize: "11px", color: "#555555", marginTop: "2px" }}>${effectiveAnnual(plan)} {t.pricing.billedAnnually}</p>
                    ) : discount?.active ? (
                      <p style={{ fontSize: "11px", color: "rgba(74,222,128,0.6)", marginTop: "3px" }}>{discount.percent}{t.pricing.discountApplied}</p>
                    ) : (
                      <p style={{ fontSize: "11px", color: "transparent", marginTop: "3px", userSelect: "none" }}>·</p>
                    )}
                  </>
                )}
              </div>
              <button onClick={() => handleSelect(plan)} onMouseEnter={() => setHoveredPlan(plan.key)} onMouseLeave={() => setHoveredPlan(null)} style={btnStyle(plan, hoveredPlan === plan.key)}>
                {plan.cta}
              </button>
              <div style={{ height: "1px", background: "#1a1a1a", marginBottom: "14px" }} />
              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.80)", paddingTop: "10px", paddingBottom: "10px", borderBottom: i < plan.features.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                    <FeatureTick />{f}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.60)", textAlign: "center" }}>{fmtChars(plan.characters)} {t.pricing.charsPerMonth}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lifetime plan banner — only shown when user has lifetime */}
        {currentPlan === "lifetime" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{
            marginBottom: "40px",
            borderRadius: "16px",
            border: "1px solid rgba(245,158,11,0.35)",
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 100%)",
            padding: "28px 32px",
            gap: "24px",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span style={{ fontSize: "20px", fontWeight: 900 }}>∞</span>
                <span style={{ fontSize: "17px", fontWeight: 800, color: "#f59e0b" }}>{t.pricing.lifetimeName}</span>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(245,158,11,0.45)", color: "#f59e0b", background: "rgba(245,158,11,0.1)" }}>
                  {t.pricing.currentPlan}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                {t.pricing.lifetimeDesc}
              </p>
            </div>
            <Link
              href="/checkout/lifetime"
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "1px solid rgba(245,158,11,0.4)",
                background: "rgba(245,158,11,0.12)",
                color: "#f59e0b",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {t.pricing.lifetimeRenew}
            </Link>
          </div>
        )}

        {/* Competitor comparison */}
        <div style={{ marginBottom: "56px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "4px", textAlign: "center" }}>
            {t.pricing.comparison}
          </h2>
          <p style={{ fontSize: "13px", color: "#444444", textAlign: "center", marginBottom: "20px" }}>
            {t.pricing.comparisonSubtitle}
          </p>

          {/* MOBILE: card layout */}
          <div className="md:hidden" style={{ flexDirection: "column", gap: "10px" }}>
            {[
              { name: "ElevenLabs", cols: ["~88k", "~200k", "~330k", "~1.85M"], elite: false },
              { name: "Minimax",    cols: ["~176k", "~650k", "~1.5M", "~9M"],   elite: false },
              { name: "Elite Labs", cols: ["250k", "1M", "2M", "15M"],          elite: true  },
            ].map((row) => (
              <div key={row.name} style={{
                borderRadius: "12px",
                border: row.elite ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.07)",
                background: row.elite ? "rgba(255,255,255,0.04)" : "transparent",
                padding: "14px 16px",
                borderLeft: row.elite ? "3px solid #ffffff" : undefined,
              }}>
                <p style={{ fontSize: "13px", fontWeight: row.elite ? 700 : 500, color: row.elite ? "#ffffff" : "#555555", marginBottom: "10px" }}>
                  {row.name}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                  {["~$8/mo", "~$26/mo", "~$49/mo", "~$315/mo"].map((price, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "9px", color: "#444444", marginBottom: "3px", whiteSpace: "nowrap" }}>{price}</p>
                      <p style={{ fontSize: "12px", fontWeight: row.elite ? 700 : 400, color: row.elite ? "#ffffff" : "#444444" }}>
                        {row.cols[i]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: original table */}
          <div className="hidden md:block" style={{ overflowX: "auto" }}>
            <div style={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.10)", overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#111111" }}>
                    <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "#555555", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {t.pricing.platform}
                    </th>
                    {[`~$8${t.pricing.perMonth}`, `~$26${t.pricing.perMonth}`, `~$49${t.pricing.perMonth}`, `~$315${t.pricing.perMonth}`].map((col) => (
                      <th key={col} style={{ padding: "12px 10px", fontWeight: 600, color: "#555555", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "ElevenLabs", cols: ["~88.000 chars", "~200.000 chars", "~330.000 chars", "~1.850.000 chars"] },
                    { name: "Minimax",    cols: ["~176.000 chars", "~650.000 chars", "~1.500.000 chars", "~9.000.000 chars"] },
                  ].map((row, i) => (
                    <tr key={row.name} style={{ background: i % 2 === 0 ? "transparent" : "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px 16px", color: "#555555", fontWeight: 500 }}>{row.name}</td>
                      {row.cols.map((c, j) => (
                        <td key={j} style={{ padding: "12px 10px", textAlign: "center", color: "#444444" }}>{c}</td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderLeft: "3px solid #ffffff" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#ffffff" }}>Elite Labs</td>
                    {["250.000 chars", "1.000.000 chars", "2.000.000 chars", "15.000.000 chars"].map((c) => (
                      <td key={c} style={{ padding: "12px 10px", textAlign: "center", fontWeight: 600, color: "#ffffff" }}>{c}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ marginTop: "12px", textAlign: "center", fontSize: "13px" }}>
            <span style={{ color: "#ffffff", fontWeight: 600 }}>{t.pricing.upTo8x}</span>
            {" "}
            <span style={{ color: "#444444", fontWeight: 400 }}>{t.pricing.noLimit}</span>
          </p>
        </div>

        {/* ── Elite Text section (hidden temporarily) ────────────────
        <div style={{ marginBottom: "64px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: "rgba(139,92,246,0.15)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Nuevo
              </span>
            </div>
            <h2 style={{ fontSize: "clamp(20px,4vw,26px)", fontWeight: 800, color: "#fff", margin: "0 0 8px", lineHeight: 1.2 }}>
              Elite Text — Generación de Guiones con IA
            </h2>
            <p style={{ fontSize: "14px", color: "#555555", margin: 0 }}>
              Crea guiones de podcast, YouTube y vídeo con Claude Sonnet y nárralos directamente con TTS
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "12px", maxWidth: "760px", margin: "0 auto" }}>
            {([
              {
                key: "text_pro",
                name: "Text Pro",
                price: 18,
                tokens: 750_000,
                scripts: 150,
                minutes: 3000,
                features: [
                  "750.000 tokens/mes",
                  "~150 guiones de 20 min",
                  "~3.000 min de audio narrado",
                  "Claude Sonnet · máxima calidad",
                  "Envío directo a narración TTS",
                ],
              },
              {
                key: "text_elite",
                name: "Text Elite",
                price: 60,
                tokens: 3_000_000,
                scripts: 600,
                minutes: 12000,
                popular: true,
                features: [
                  "3.000.000 tokens/mes",
                  "~600 guiones de 20 min",
                  "~12.000 min de audio narrado",
                  "Claude Sonnet · máxima calidad",
                  "Envío directo a narración TTS",
                  "Ideal para creadores intensivos",
                ],
              },
            ] as { key: string; name: string; price: number; tokens: number; scripts: number; minutes: number; features: string[]; popular?: boolean }[]).map((plan) => (
              <div
                key={plan.key}
                style={{
                  borderRadius: "16px",
                  padding: "22px 20px 20px",
                  background: "#0a0a0f",
                  border: plan.popular ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  position: "relative",
                  display: "flex", flexDirection: "column",
                }}
              >
                {plan.popular && (
                  <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 12px", borderRadius: "999px", background: "#8b5cf6", color: "#fff", whiteSpace: "nowrap" }}>
                      Más popular
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>{plan.name}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "30px", fontWeight: 800, color: "#8b5cf6", lineHeight: 1 }}>${plan.price}</span>
                    <span style={{ fontSize: "12px", color: "#555", display: "block" }}>/mes</span>
                  </div>
                </div>
                <p style={{ fontSize: "12px", color: "#555", marginBottom: "16px" }}>
                  {plan.tokens.toLocaleString("es-ES")} tokens · ~{plan.scripts} guiones
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                      <span style={{ color: "#8b5cf6", fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={isSignedIn ? "/dashboard" : "/sign-up"}
                  style={{
                    display: "block", textAlign: "center",
                    padding: "10px", borderRadius: "8px",
                    background: plan.popular ? "#8b5cf6" : "rgba(139,92,246,0.15)",
                    color: plan.popular ? "#fff" : "#8b5cf6",
                    fontSize: "13px", fontWeight: 700, textDecoration: "none",
                    transition: "background 0.15s",
                    border: plan.popular ? "none" : "1px solid rgba(139,92,246,0.3)",
                  }}
                >
                  {isSignedIn ? "Ir al dashboard →" : "Empezar →"}
                </a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: "12px", color: "#444", marginTop: "16px" }}>
            Plans independientes · No requieren un plan de voz activo · Cancela cuando quieras
          </p>
        </div>
        ── end Elite Text section ── */}

        {/* FAQ */}
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "20px", textAlign: "center" }}>
            {t.pricing.faq}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { q: t.pricing.cancelAnytimeQ, a: t.pricing.cancelAnytimeA },
              { q: t.pricing.charsExpireQ,   a: t.pricing.charsExpireA },
              { q: t.pricing.changePlanQ,    a: t.pricing.changePlanA },
              { q: t.pricing.cloneFormatsQ,  a: t.pricing.cloneFormatsA },
            ].map((faq) => (
              <div key={faq.q} style={{ padding: "14px 18px", borderRadius: "10px", border: "1px solid #1a1a1a", background: "#0a0a0a" }}>
                <p style={{ fontWeight: 600, color: "#e5e7eb", marginBottom: "3px", fontSize: "13px" }}>{faq.q}</p>
                <p style={{ fontSize: "12px", color: "#555555" }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
}
