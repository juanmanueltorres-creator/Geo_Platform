// Project ranking helper for GeoPlatform
// Returns { priority, confidence, reasons } for a given project

export type ProjectRanking = {
  priority: 'HIGH' | 'MEDIUM' | 'LOW',
  confidence: number,
  reasons: string[]
}

const STAGE_CONFIDENCE: Record<string, number> = {
  operation: 0.9,
  advanced: 0.75,
  development: 0.6,
  exploration: 0.4,
  brownfield: 0.3
}

const MAJOR_COMPANIES = [
  'Barrick', 'Shandong', 'Glencore', 'Lundin', 'McEwen', 'Agnico', 'Newmont'
]

export function rankProject(project: any): ProjectRanking {
  const stage = (project.stage || '').toLowerCase()
  const commodity = (project.commodity || '').toUpperCase()
  const projectType = (project.project_type || '').toLowerCase()
  const company = (project.company || '')

  // Priority
  let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
  if ((stage === 'operation' || stage === 'advanced') && (commodity.includes('CU') || commodity.includes('AU'))) {
    priority = 'HIGH'
  } else if (stage === 'development' || (stage === 'advanced' && !(commodity.includes('CU') || commodity.includes('AU')))) {
    priority = 'MEDIUM'
  } else if (stage === 'exploration' || stage === 'brownfield') {
    priority = 'LOW'
  }

  // Confidence
  const confidence = STAGE_CONFIDENCE[stage] ?? 0.3

  // Reasons
  const reasons: string[] = []
  // Stage
  if (stage === 'operation') reasons.push('operation stage')
  if (stage === 'advanced') reasons.push('advanced stage')
  if (stage === 'development') reasons.push('development stage')
  if (stage === 'exploration') reasons.push('exploration stage')
  if (stage === 'brownfield') reasons.push('brownfield stage')
  // Commodity
  if (commodity.includes('CU')) reasons.push('copper exposure')
  if (commodity.includes('AU')) reasons.push('gold exposure')
  // Project type
  if (projectType.includes('porphyry')) reasons.push('porphyry system')
  if (projectType.includes('epithermal')) reasons.push('epithermal system')
  // Company
  if (MAJOR_COMPANIES.some(mc => company.toLowerCase().includes(mc.toLowerCase()))) {
    reasons.push('operated by major company')
  }
  // No app-specific or presentation reasons
  return { priority, confidence, reasons }
}
