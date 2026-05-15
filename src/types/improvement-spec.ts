import type { DesignAnalysis } from './design-analysis'
import type { BeautyDesignSystem } from './design-system'

export type ImprovedDesignSpec = {
  title: string
  categoryDesignSystem: BeautyDesignSystem['category']
  sourceAnalysisSummary: DesignAnalysis['summary']
  hero: {
    headline: string
    subheadline: string
    visualTreatment: string
  }
  sections: Array<{
    heading: string
    goal: string
    designInstruction: string
  }>
  colorPlan: {
    background: string
    text: string
    accent: string
    callout: string
  }
  typographyPlan: string
  imagePrompt: string
  qualityChecklist: string[]
  generatedAt: string
  mock: boolean
}
