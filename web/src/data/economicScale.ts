import { calculateEconomicScaleSummary } from '../lib/economicScale'

export interface EconomicScaleResourceBase {
  copper_mi_tonnes: number
  copper_inferred_tonnes: number
  gold_mi_oz: number
  gold_inferred_oz: number
  silver_mi_oz: number
  silver_inferred_oz: number
}

export interface EconomicScaleOxideBlock {
  oxide_tonnage_mt: number
  oxide_cu_pct: number
  oxide_au_gpt: number
  oxide_ag_gpt: number
}

export interface EconomicScaleMarketSnapshot {
  copper_usd_per_lb: number
  gold_usd_per_oz: number
  silver_usd_per_oz: number
}

export interface EconomicScaleMetadata {
  project: string
  price_mode: 'live_market_snapshot'
  disclaimer: string
}

export interface EconomicScaleProjectData {
  metadata: EconomicScaleMetadata
  resourceBase: EconomicScaleResourceBase
  optionalOxideBlock?: EconomicScaleOxideBlock
  marketSnapshot: EconomicScaleMarketSnapshot
}

export const filoDelSolEconomicScale: EconomicScaleProjectData = {
  metadata: {
    project: 'Filo del Sol',
    price_mode: 'live_market_snapshot',
    disclaimer:
      'Illustrative gross in-situ metal value. Not a project valuation.',
  },
  resourceBase: {
    copper_mi_tonnes: 13_000_000,
    copper_inferred_tonnes: 25_000_000,
    gold_mi_oz: 32_000_000,
    gold_inferred_oz: 49_000_000,
    silver_mi_oz: 659_000_000,
    silver_inferred_oz: 808_000_000,
  },
  optionalOxideBlock: {
    oxide_tonnage_mt: 434,
    oxide_cu_pct: 0.34,
    oxide_au_gpt: 0.28,
    oxide_ag_gpt: 2.5,
  },
  marketSnapshot: {
    copper_usd_per_lb: 6.07,
    gold_usd_per_oz: 4835.63,
    silver_usd_per_oz: 79.21,
  },
}

export const filoDelSolEconomicScaleSummary =
  calculateEconomicScaleSummary(filoDelSolEconomicScale)
