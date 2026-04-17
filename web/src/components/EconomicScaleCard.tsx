import { useEffect, useState } from 'react'
import { Badge } from './ui/Badge'
import { Card } from './ui/Card'
import {
  filoDelSolEconomicScale,
} from '@/data/economicScale'
import { api, type LiveMetalsMarketResponse } from '@/lib/api'
import { calculateGrossValueBreakdown } from '@/lib/economicScale'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})

const copperPriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ouncePriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function formatGrossValue(value: number): string {
  return currencyFormatter.format(value)
}

function formatCopperPrice(value: number): string {
  return `${copperPriceFormatter.format(value)}/lb`
}

function formatOuncePrice(value: number): string {
  return `${ouncePriceFormatter.format(value)}/oz`
}

function formatContainedCopper(value: number): string {
  return `${quantityFormatter.format(value)} t`
}

function formatContainedOunces(value: number): string {
  return `${quantityFormatter.format(value)} oz`
}

function getMarketBadgeLabel(market: LiveMetalsMarketResponse | null): string {
  if (!market) return 'Fallback Market'
  if (market.is_fallback || market.mode === 'fallback') return 'Fallback Market'
  if (market.mode === 'partial_live') return 'Mixed Market'
  if (market.mode === 'cache') return 'Cached Market'
  return 'Live Market'
}

function CompactStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  )
}

export function EconomicScaleCard() {
  const { marketSnapshot: fallbackMarketSnapshot, resourceBase } = filoDelSolEconomicScale
  const [marketData, setMarketData] = useState<LiveMetalsMarketResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadMarketPrices = async () => {
      try {
        const response = await api.getLiveMetalsMarket()
        if (!cancelled) {
          setMarketData(response)
        }
      } catch {
        if (!cancelled) {
          setMarketData(null)
        }
      }
    }

    loadMarketPrices()

    return () => {
      cancelled = true
    }
  }, [])

  const marketSnapshot = marketData?.prices ?? fallbackMarketSnapshot

  const containedCopper =
    resourceBase.copper_mi_tonnes + resourceBase.copper_inferred_tonnes
  const containedGold = resourceBase.gold_mi_oz + resourceBase.gold_inferred_oz
  const containedSilver =
    resourceBase.silver_mi_oz + resourceBase.silver_inferred_oz

  const grossValueBreakdown = calculateGrossValueBreakdown({
    copperTonnes: containedCopper,
    goldOunces: containedGold,
    silverOunces: containedSilver,
    copperUsdPerLb: marketSnapshot.copper_usd_per_lb,
    goldUsdPerOz: marketSnapshot.gold_usd_per_oz,
    silverUsdPerOz: marketSnapshot.silver_usd_per_oz,
  })

  const totalGrossValue = grossValueBreakdown.total

  return (
    <Card className="mb-5 overflow-hidden border-white/12 bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(15,23,42,0.72))] shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/75">
              {filoDelSolEconomicScale.metadata.project}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
              Economic Snapshot
            </h2>
          </div>
          <Badge
            color="amber"
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300 shadow-none"
          >
            {getMarketBadgeLabel(marketData)}
          </Badge>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Market Prices
          </div>
          {marketData?.mode === 'partial_live' && (
            <div className="mb-2 text-[11px] leading-4 text-slate-400">
              Gold and silver are live. Copper uses fallback pricing.
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <CompactStat
              label="Copper"
              value={formatCopperPrice(marketSnapshot.copper_usd_per_lb)}
            />
            <CompactStat
              label="Gold"
              value={formatOuncePrice(marketSnapshot.gold_usd_per_oz)}
            />
            <CompactStat
              label="Silver"
              value={formatOuncePrice(marketSnapshot.silver_usd_per_oz)}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Contained Metals
          </div>
          <div className="grid grid-cols-3 gap-2">
            <CompactStat
              label="Contained Copper"
              value={formatContainedCopper(containedCopper)}
            />
            <CompactStat
              label="Contained Gold"
              value={formatContainedOunces(containedGold)}
            />
            <CompactStat
              label="Contained Silver"
              value={formatContainedOunces(containedSilver)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/25 bg-amber-400/[0.09] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100/80">
            Illustrative Gross Metal Value
          </div>
          <div className="mt-1.5 text-[2rem] font-semibold tracking-tight text-white">
            {formatGrossValue(totalGrossValue)}
          </div>
          <div className="mt-1 text-xs font-medium text-amber-50/70">
            At current market prices
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-2.5 text-[11px] leading-5 text-slate-400">
        Gross in-situ metal value for illustration only. Not a project valuation.
      </div>
    </Card>
  )
}

export default EconomicScaleCard
