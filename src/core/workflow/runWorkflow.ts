import { analyzeImage } from '../../providers/openrouter/analyzeImage'
import { generateImage as generateImageWithOpenAi } from '../../providers/openai/generateImage'
import { generateImage as generateImageWithOpenRouter } from '../../providers/openrouter/generateImage'
import { loadDesignSystem } from '../analysis/loadDesignSystem'
import { createBeforeAfterCanvas } from '../comparison/createBeforeAfterCanvas'
import { createImprovementSpec } from '../generation/createImprovementSpec'
import { appendResultToSheet } from '../sheet/appendResultToSheet'
import { uploadBeforeAfterToDrive } from '../storage/uploadBeforeAfterToDrive'
import type {
  WorkflowInput,
  WorkflowProgressHandler,
  WorkflowResult,
} from '../../types/workflow'
import { fileToDataUrl } from '../../utils/fileToDataUrl'

export async function runWorkflow(
  input: WorkflowInput,
  onProgress: WorkflowProgressHandler,
): Promise<WorkflowResult> {
  onProgress('reading_upload', 'Reading uploaded original image.')
  const beforeImageUrl = await fileToDataUrl(input.originalImage)

  onProgress('analyzing_original', 'Generating original_analysis.json.')
  const originalAnalysis = await analyzeImage({
    imageDataUrl: beforeImageUrl,
    fileName: input.originalImage.name,
    category: input.category,
  })

  onProgress('loading_design_system', 'Loading category design system JSON.')
  const designSystem = loadDesignSystem(input.category)

  onProgress('creating_spec', 'Generating improved_design_spec.json.')
  const improvedDesignSpec = createImprovementSpec(
    originalAnalysis,
    designSystem,
    input.referenceStyleInfluence,
  )

  onProgress('generating_after', 'Generating After image.')
  const imageProvider = import.meta.env.VITE_IMAGE_PROVIDER || 'openrouter'
  const generateAfterImage =
    imageProvider === 'openai'
      ? generateImageWithOpenAi
      : generateImageWithOpenRouter
  const afterImage = await generateAfterImage({
    beforeImageUrl,
    originalAnalysis,
    designSystem,
    spec: improvedDesignSpec,
  })

  onProgress('creating_comparison', 'Creating Before & After comparison image.')
  const comparisonImageUrl = await createBeforeAfterCanvas(
    beforeImageUrl,
    afterImage.imageUrl,
  )

  onProgress('uploading_drive', 'Uploading Before and After images to Drive.')
  const driveResult = await uploadBeforeAfterToDrive(
    input.companyName,
    beforeImageUrl,
    afterImage.imageUrl,
  )

  onProgress('appending_sheet', 'Appending result row to Google Sheet.')
  const sheetAppend = await appendResultToSheet({
    companyName: input.companyName,
    email: input.email,
    beforeDriveLink: driveResult.beforeDriveLink,
    afterDriveLink: driveResult.afterDriveLink,
  })

  onProgress('completed', 'Workflow completed.')

  return {
    companyName: input.companyName,
    email: input.email,
    category: input.category,
    beforeImageUrl,
    afterImageUrl: afterImage.imageUrl,
    afterImageSource: afterImage.source,
    afterImageStatus: afterImage.status,
    afterImageFallbackReason: afterImage.fallbackReason,
    comparisonImageUrl,
    beforeDriveLink: driveResult.beforeDriveLink,
    afterDriveLink: driveResult.afterDriveLink,
    sheetAppend,
    originalAnalysis,
    designSystem,
    improvedDesignSpec,
    designSystemJsonPathUsed: designSystem.designSystemJsonPath,
    referenceSourceFileNamesUsed:
      designSystem.referenceSources?.map((source) => source.fileName) ?? [],
    analysisSourceFileNamesUsed:
      designSystem.analysisSourceFiles?.map((source) => source.fileName) ?? [],
    designSystemGeneratedAt: designSystem.generatedAt,
    referenceImageCountUsed: designSystem.referenceImageCount ?? 0,
    analysisCompletenessStatus: designSystem.analysisCompleteness?.status,
    analysisCompletenessScore:
      designSystem.analysisCompleteness?.averageCompletenessScore,
    requiresAdditionalAnalysis:
      designSystem.analysisCompleteness?.requiresAdditionalAnalysis ?? false,
    missingAnalysisWarnings: designSystem.missingAnalysisWarnings ?? [],
    referenceImagesPassedToGeneration:
      afterImage.referenceImagesPassedToGeneration,
    referenceContactSheetPath: afterImage.referenceContactSheetPath,
    referenceContactSheetMode: afterImage.referenceContactSheetMode,
    referenceImageCountPassedToGeneration:
      afterImage.referenceImageCountPassedToGeneration,
    generationUsedDirectReferenceImages:
      afterImage.generationUsedDirectReferenceImages,
    originalContentBoardGenerated: afterImage.originalContentBoardGenerated,
    originalContentBoardMode: afterImage.originalContentBoardMode,
    originalContentBoardDimensions: afterImage.originalContentBoardDimensions,
    issueReport: afterImage.issueReport || originalAnalysis.issueReport,
  }
}
