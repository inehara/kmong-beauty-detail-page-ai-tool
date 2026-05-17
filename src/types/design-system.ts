import type { BeautySubcategory } from './workflow'

export type DesignSystemTokenSet = {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
}

export type ReferenceAnalysisStatus = 'complete' | 'partial' | 'incomplete'

export type DesignSystemReferenceSource = {
  fileName: string
  relativePath: string
  includedInAggregation: boolean
  analysisStatus: ReferenceAnalysisStatus
  analysisCompletenessScore: number
  requiresAdditionalAnalysis: boolean
}

export type DesignSystemAnalysisSourceFile = {
  fileName: string
  relativePath: string
  sourceReferenceFile: string
  analysisStatus: ReferenceAnalysisStatus
  coversRequiredDesignElements: boolean
}

export type DesignSystemAnalysisCompleteness = {
  status: ReferenceAnalysisStatus
  averageCompletenessScore: number
  requiresAdditionalAnalysis: boolean
  incompleteReferenceFiles: string[]
  missingCommonFields: string[]
}

export type DesignSystemAggregationSummary = {
  totalReferenceImagesFound?: number
  totalReferenceImagesIncluded: number
  totalImageAnalysesUsed?: number
  completeReferenceImages?: number
  incompleteReferenceImages?: number
  generatedDesignSystemJsonPath?: string
  copiedAppJsonPath?: string
  manifestPath?: string
  publicReferenceAssetsBasePath?: string
  publicReferenceContactSheetPath?: string
  referenceContactSheetGenerated?: boolean
  referenceContactSheetMode?: string
  referenceContactSheetTileCount?: number
  referenceContactSheetCropStrategy?: string
  contactSheetDimensions?: { width: number; height: number }
  contactSheetReadableForGeneration?: boolean
}

export type ReferenceAnalysisTrace = {
  fileName: string
  missingDesignElementFields: string[]
  analysisSourceFile?: DesignSystemAnalysisSourceFile
}

export type BeautyDesignSystem = {
  category: BeautySubcategory
  displayName: string
  sourceType?: string
  sourceStatus?: string
  version?: string
  generatedAt?: string
  generatedFromBuilder?: boolean
  designSystemJsonPath?: string
  referenceImageCount?: number
  referenceSources?: DesignSystemReferenceSource[]
  analysisSourceFiles?: DesignSystemAnalysisSourceFile[]
  analysisCompleteness?: DesignSystemAnalysisCompleteness
  missingAnalysisWarnings?: string[]
  aggregationSummary?: DesignSystemAggregationSummary
  referenceAnalysisTrace?: ReferenceAnalysisTrace[]
  publicReferenceAssetsBasePath?: string
  publicReferenceImagePaths?: string[]
  publicReferenceContactSheetPath?: string
  referenceContactSheetGenerated?: boolean
  referenceContactSheetMode?: string
  referenceContactSheetTileCount?: number
  referenceContactSheetCropStrategy?: string
  contactSheetDimensions?: { width: number; height: number }
  contactSheetReadableForGeneration?: boolean
  referenceImageCountAvailableForGeneration?: number
  referenceImagesPassedToGenerationDefault?: string[]
  positioning: string
  coreDesignPrinciples?: string[]
  heroSectionRules?: string[]
  typographyRules?: string[]
  colorRules?: string[]
  sectionPatterns?: string[]
  conversionRules?: string[]
  trustElementRules?: string[]
  visualTreatmentRules?: string[]
  doRules?: string[]
  avoidRules?: string[]
  promptGuidance?: string
  typography: {
    headline: string
    body: string
    label: string
  }
  colors: DesignSystemTokenSet
  layoutRules: string[]
  contentBlocks: string[]
  imageDirection: string[]
  conversionCues: string[]
}
