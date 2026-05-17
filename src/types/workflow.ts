import type { DesignAnalysis } from './design-analysis'
import type { BeautyDesignSystem } from './design-system'
import type { GoogleSheetAppendResult } from './google-sheet'
import type { ImprovedDesignSpec } from './improvement-spec'
import type { IssueReport } from './issue-report'

export type BeautySubcategory =
  | 'skincare'
  | 'makeup'
  | 'cleansing'
  | 'hair_body'
  | 'beauty_tool'

export type ReferenceStyleInfluence = 'low' | 'medium' | 'high'

export type WorkflowProgressStep =
  | 'idle'
  | 'reading_upload'
  | 'analyzing_original'
  | 'loading_design_system'
  | 'creating_spec'
  | 'generating_after'
  | 'creating_comparison'
  | 'uploading_drive'
  | 'appending_sheet'
  | 'completed'
  | 'failed'

export type WorkflowInput = {
  companyName: string
  email: string
  category: BeautySubcategory
  referenceStyleInfluence: ReferenceStyleInfluence
  originalImage: File
}

export type WorkflowResult = {
  companyName: string
  email: string
  category: BeautySubcategory
  beforeImageUrl: string
  afterImageUrl: string
  afterImageSource: 'mock' | 'openrouter' | 'openai'
  afterImageStatus: string
  afterImageFallbackReason?: string
  comparisonImageUrl: string
  beforeDriveLink: string
  afterDriveLink: string
  sheetAppend: GoogleSheetAppendResult
  originalAnalysis: DesignAnalysis
  designSystem: BeautyDesignSystem
  improvedDesignSpec: ImprovedDesignSpec
  designSystemJsonPathUsed?: string
  referenceSourceFileNamesUsed: string[]
  analysisSourceFileNamesUsed: string[]
  designSystemGeneratedAt?: string
  referenceImageCountUsed: number
  analysisCompletenessStatus?: string
  analysisCompletenessScore?: number
  requiresAdditionalAnalysis: boolean
  missingAnalysisWarnings: string[]
  referenceImagesPassedToGeneration: string[]
  referenceContactSheetPath?: string
  referenceContactSheetMode?: string
  referenceImageCountPassedToGeneration: number
  generationUsedDirectReferenceImages: boolean
  originalContentBoardGenerated: boolean
  originalContentBoardMode?: string
  originalContentBoardDimensions?: { width: number; height: number }
  issueReport?: IssueReport
}

export type WorkflowProgressHandler = (
  step: WorkflowProgressStep,
  message: string,
) => void

export const beautySubcategories: BeautySubcategory[] = [
  'skincare',
  'makeup',
  'cleansing',
  'hair_body',
  'beauty_tool',
]
