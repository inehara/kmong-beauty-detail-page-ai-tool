import type { BeautySubcategory } from './workflow'
import type { IssueReport } from './issue-report'

export type DetailPageSection = {
  name: string
  observedIssue: string
  recommendedFix: string
}

export type DesignAnalysis = {
  fileName: string
  category: BeautySubcategory
  summary: string
  targetCustomer: string
  currentStrengths: string[]
  improvementOpportunities: string[]
  layout: string
  typography: string
  colorPalette: string
  visualHierarchy: string
  conversionIssues: string[]
  recommendedDirection: string
  sections: DetailPageSection[]
  visualTone: string
  confidenceScore: number
  analysisSource: 'mock' | 'openrouter'
  issueReport?: IssueReport
  generatedAt: string
  mock: boolean
}
