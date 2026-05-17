import type { DesignAnalysis } from './design-analysis'
import type { BeautyDesignSystem } from './design-system'
import type { ReferenceStyleInfluence } from './workflow'

export type ImprovedDesignSpec = {
  title: string
  categoryDesignSystem: BeautyDesignSystem['category']
  generationMode: 'content_extraction_direct_reference_rebuild'
  referenceStyleInfluence: ReferenceStyleInfluence
  sourceAnalysisSummary: DesignAnalysis['summary']
  contentExtractionRules: string[]
  directReferenceStyleRules: string[]
  directReferenceUsageRules: string[]
  referenceContactSheetRules: string[]
  originalLayoutDiscardRules: string[]
  referenceRebuildRules: string[]
  outputCanvasRules: string[]
  contentPreservationRules: string[]
  visualTransformationRules: string[]
  hero: {
    headline: string
    subheadline: string
    visualTreatment: string
  }
  sections: Array<{
    heading: string
    goal: string
    designInstruction: string
    sourceRole: 'original_content_source'
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
