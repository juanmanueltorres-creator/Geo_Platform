import type { EconomicScaleProjectData } from '../data/economicScale'

const POUNDS_PER_METRIC_TONNE = 2204.62

export interface EconomicScaleMetalBreakdown {
  copper: number
  gold: number
  silver: number
  total: number
}

export interface EconomicScaleSummary {
  mi: EconomicScaleMetalBreakdown
  inferred: EconomicScaleMetalBreakdown
  combined: EconomicScaleMetalBreakdown
}

export function calculateGrossCopperValue(
  tonnes: number,
  usdPerLb: number,
): number {
  return tonnes * POUNDS_PER_METRIC_TONNE * usdPerLb
}

export function calculateGrossGoldValue(
  ounces: number,
  usdPerOz: number,
): number {
  return ounces * usdPerOz
}

export function calculateGrossSilverValue(
  ounces: number,
  usdPerOz: number,
): number {
  return ounces * usdPerOz
}

export function calculateTotalGrossValue(
  breakdown: Omit<EconomicScaleMetalBreakdown, 'total'>,
): number {
  return breakdown.copper + breakdown.gold + breakdown.silver
}

export function calculateGrossValueBreakdown(params: {
  copperTonnes: number
  goldOunces: number
  silverOunces: number
  copperUsdPerLb: number
  goldUsdPerOz: number
  silverUsdPerOz: number
}): EconomicScaleMetalBreakdown {
  const copper = calculateGrossCopperValue(
    params.copperTonnes,
    params.copperUsdPerLb,
  )
  const gold = calculateGrossGoldValue(params.goldOunces, params.goldUsdPerOz)
  const silver = calculateGrossSilverValue(
    params.silverOunces,
    params.silverUsdPerOz,
  )

  return {
    copper,
    gold,
    silver,
    total: calculateTotalGrossValue({ copper, gold, silver }),
  }
}

export function calculateEconomicScaleSummary(
  projectData: EconomicScaleProjectData,
): EconomicScaleSummary {
  const { resourceBase, marketSnapshot } = projectData

  const mi = calculateGrossValueBreakdown({
    copperTonnes: resourceBase.copper_mi_tonnes,
    goldOunces: resourceBase.gold_mi_oz,
    silverOunces: resourceBase.silver_mi_oz,
    copperUsdPerLb: marketSnapshot.copper_usd_per_lb,
    goldUsdPerOz: marketSnapshot.gold_usd_per_oz,
    silverUsdPerOz: marketSnapshot.silver_usd_per_oz,
  })

  const inferred = calculateGrossValueBreakdown({
    copperTonnes: resourceBase.copper_inferred_tonnes,
    goldOunces: resourceBase.gold_inferred_oz,
    silverOunces: resourceBase.silver_inferred_oz,
    copperUsdPerLb: marketSnapshot.copper_usd_per_lb,
    goldUsdPerOz: marketSnapshot.gold_usd_per_oz,
    silverUsdPerOz: marketSnapshot.silver_usd_per_oz,
  })

  const combined = calculateGrossValueBreakdown({
    copperTonnes:
      resourceBase.copper_mi_tonnes + resourceBase.copper_inferred_tonnes,
    goldOunces: resourceBase.gold_mi_oz + resourceBase.gold_inferred_oz,
    silverOunces:
      resourceBase.silver_mi_oz + resourceBase.silver_inferred_oz,
    copperUsdPerLb: marketSnapshot.copper_usd_per_lb,
    goldUsdPerOz: marketSnapshot.gold_usd_per_oz,
    silverUsdPerOz: marketSnapshot.silver_usd_per_oz,
  })

  return {
    mi,
    inferred,
    combined,
  }
}
