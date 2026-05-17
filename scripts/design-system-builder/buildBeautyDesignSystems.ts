import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const beautyCategories = [
  'skincare',
  'makeup',
  'cleansing',
  'hair_body',
  'beauty_tool',
] as const

type BeautyCategory = (typeof beautyCategories)[number]

type ReferenceImage = {
  category: BeautyCategory
  fileName: string
  path: string
  mimeType: string
}

type AnalysisStatus = 'complete' | 'partial' | 'incomplete'
type SourceStatus =
  | 'generated_from_reference_images'
  | 'generated_from_reference_images_partial'
  | 'generated_from_reference_images_incomplete'

type FullDesignElementAnalysis = Record<string, string[]>

type ImageAnalysis = {
  fileName: string
  category: BeautyCategory
  analysisStatus: AnalysisStatus
  analysisCompletenessScore: number
  missingDesignElementFields: string[]
  requiresAdditionalAnalysis: boolean
  fullDesignElementAnalysis: FullDesignElementAnalysis
  reusablePatterns: string[]
  extractionNotes: string[]
  layoutStructure: string[]
  sectionOrder: string[]
  heroSectionStyle: string[]
  typographyStyle: string[]
  colorPalette: string[]
  spacingPattern: string[]
  visualHierarchy: string[]
  ctaPlacement: string[]
  trustElements: string[]
  productVisualTreatment: string[]
  iconBadgeUsage: string[]
  commerceConversionPatterns: string[]
  strengths: string[]
  reusableDesignRules: string[]
}

type GeneratedDesignSystem = {
  category: BeautyCategory
  displayName: string
  sourceType: 'kmong_reference_analysis'
  sourceStatus: SourceStatus
  version: string
  generatedAt: string
  generatedFromBuilder: boolean
  designSystemJsonPath: string
  referenceImageCount: number
  referenceSources: ReferenceSource[]
  analysisSourceFiles: AnalysisSourceFile[]
  analysisCompleteness: CategoryAnalysisCompleteness
  missingAnalysisWarnings: string[]
  aggregationSummary: AggregationSummary
  referenceAnalysisTrace: ReferenceAnalysisTrace[]
  publicReferenceAssetsBasePath: string
  publicReferenceImagePaths: string[]
  publicReferenceContactSheetPath?: string
  referenceContactSheetGenerated: boolean
  referenceContactSheetMode: 'cropped_grid' | 'copy_only'
  referenceContactSheetTileCount: number
  referenceContactSheetCropStrategy: 'hero_middle_lower'
  contactSheetDimensions?: { width: number; height: number }
  contactSheetReadableForGeneration: boolean
  referenceImageCountAvailableForGeneration: number
  referenceImagesPassedToGenerationDefault: string[]
  positioning: string
  coreDesignPrinciples: string[]
  layoutRules: string[]
  heroSectionRules: string[]
  typographyRules: string[]
  colorRules: string[]
  sectionPatterns: string[]
  conversionRules: string[]
  trustElementRules: string[]
  visualTreatmentRules: string[]
  doRules: string[]
  avoidRules: string[]
  promptGuidance: string
  typography: {
    headline: string
    body: string
    label: string
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
  }
  contentBlocks: string[]
  imageDirection: string[]
  conversionCues: string[]
}

type ReferenceAnalysisTrace = {
  fileName: string
  missingDesignElementFields: string[]
  analysisSourceFile?: AnalysisSourceFile
}

type ReferenceSource = {
  fileName: string
  relativePath: string
  includedInAggregation: boolean
  analysisStatus: AnalysisStatus
  analysisCompletenessScore: number
  requiresAdditionalAnalysis: boolean
}

type AnalysisSourceFile = {
  fileName: string
  relativePath: string
  sourceReferenceFile: string
  analysisStatus: AnalysisStatus
  coversRequiredDesignElements: boolean
}

type CategoryAnalysisCompleteness = {
  status: AnalysisStatus
  averageCompletenessScore: number
  requiresAdditionalAnalysis: boolean
  incompleteReferenceFiles: string[]
  missingCommonFields: string[]
}

type AggregationSummary = {
  totalReferenceImagesFound: number
  totalReferenceImagesIncluded: number
  totalImageAnalysesUsed: number
  completeReferenceImages: number
  incompleteReferenceImages: number
  generatedDesignSystemJsonPath: string
  copiedAppJsonPath?: string
  manifestPath: string
  publicReferenceAssetsBasePath?: string
  publicReferenceContactSheetPath?: string
  referenceContactSheetGenerated?: boolean
  referenceContactSheetMode?: 'cropped_grid' | 'copy_only'
  referenceContactSheetTileCount?: number
  referenceContactSheetCropStrategy?: 'hero_middle_lower'
  contactSheetDimensions?: { width: number; height: number }
  contactSheetReadableForGeneration?: boolean
}

type BuildMetadata = {
  generatedDesignSystemJsonPath: string
  appSeedPath: string
  manifestPath: string
  referenceSources: ReferenceSource[]
  analysisSourceFiles: AnalysisSourceFile[]
  analysisCompleteness: CategoryAnalysisCompleteness
  missingAnalysisWarnings: string[]
  aggregationSummary: AggregationSummary
  referenceAnalysisTrace: ReferenceAnalysisTrace[]
  publicReferenceAssetsBasePath: string
  publicReferenceImagePaths: string[]
  publicReferenceContactSheetPath?: string
  referenceContactSheetGenerated: boolean
  referenceContactSheetMode: 'cropped_grid' | 'copy_only'
  referenceContactSheetTileCount: number
  referenceContactSheetCropStrategy: 'hero_middle_lower'
  contactSheetDimensions?: { width: number; height: number }
  contactSheetReadableForGeneration: boolean
  referenceImageCountAvailableForGeneration: number
  referenceImagesPassedToGenerationDefault: string[]
}

type PublicReferenceAssets = {
  basePath: string
  imagePaths: string[]
  contactSheetPath?: string
  contactSheetGenerated: boolean
  contactSheetMode: 'cropped_grid' | 'copy_only'
  contactSheetTileCount: number
  contactSheetCropStrategy: 'hero_middle_lower'
  contactSheetDimensions?: { width: number; height: number }
  contactSheetReadableForGeneration: boolean
  imageCountAvailableForGeneration: number
  defaultImagePaths: string[]
}

type OpenRouterMessageContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type EnvConfig = {
  apiKey: string
  model: string
}

const categoryDisplayNames: Record<BeautyCategory, string> = {
  skincare: 'Skincare',
  makeup: 'Makeup',
  cleansing: 'Cleansing',
  hair_body: 'Hair & Body',
  beauty_tool: 'Beauty Tool',
}

const categoryFileNames: Record<BeautyCategory, string> = {
  skincare: 'skincare.json',
  makeup: 'makeup.json',
  cleansing: 'cleansing.json',
  hair_body: 'hair_body.json',
  beauty_tool: 'beauty_tool.json',
}

const imageMimeTypes = new Map([
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
])

const requiredDesignElementFields = [
  'overallLayoutStructure',
  'sectionOrder',
  'heroSectionStyle',
  'headlineStyle',
  'subheadlineStyle',
  'bodyTextStyle',
  'typographyHierarchy',
  'colorPalette',
  'backgroundTreatment',
  'spacingRhythm',
  'gridCompositionPattern',
  'cardBlockStyle',
  'ctaButtonStyle',
  'iconStyle',
  'badgeLabelStyle',
  'trustProofElementStyle',
  'productVisualTreatment',
  'imageCropCompositionStyle',
  'beforeAfterOrProofSectionStyling',
  'ingredientFeatureSectionStyling',
  'benefitBlockStyling',
  'testimonialReviewStyling',
  'priceOfferSectionStyling',
  'footerBottomCtaStyling',
  'commerceConversionPatterns',
  'visualHierarchy',
  'reusableDesignRules',
  'strengths',
  'avoidPatterns',
] as const

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const referenceRoot = path.join(repoRoot, 'reference-images', 'kmong-beauty')
const outputRoot = path.join(repoRoot, 'outputs', 'design-system-builder')
const appDesignSystemRoot = path.join(repoRoot, 'src', 'data', 'beauty-design-systems')
const publicReferenceAssetsRoot = path.join(
  repoRoot,
  'public',
  'generated-reference-assets',
  'kmong-beauty',
)
const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions'

async function main() {
  const config = await loadConfig()
  const summaries: Array<{
    category: BeautyCategory
    referenceImageCount: number
    successfulAnalysisCount: number
    generatedJsonPath?: string
    appSeedPath?: string
  }> = []

  for (const category of beautyCategories) {
    console.log(`\n[category] ${category}`)
    const images = await readCategoryImages(category)

    if (images.length === 0) {
      console.log(`[category] ${category}: no reference images found, skipping.`)
      summaries.push({
        category,
        referenceImageCount: 0,
        successfulAnalysisCount: 0,
      })
      continue
    }

    const categoryOutputDir = path.join(outputRoot, category)
    const imageAnalysisDir = path.join(categoryOutputDir, 'image-analyses')
    const rawResponseDir = path.join(categoryOutputDir, 'raw-responses')
    await mkdir(imageAnalysisDir, { recursive: true })
    await mkdir(rawResponseDir, { recursive: true })

    const analyses: ImageAnalysis[] = []
    const analysisPathByFileName = new Map<string, string>()

    for (const image of images) {
      console.log(`[image] ${category}/${image.fileName}: analyzing`)

      try {
        const analysis = await analyzeImage(config, image)
        const analysisPath = path.join(
          imageAnalysisDir,
          `${safeOutputName(image.fileName)}.analysis.json`,
        )

        await writeJson(analysisPath, analysis)
        analysisPathByFileName.set(image.fileName, path.relative(repoRoot, analysisPath))
        analyses.push(analysis)
        console.log(`[image] ${category}/${image.fileName}: analysis complete`)
      } catch (error) {
        const errorPath = path.join(
          imageAnalysisDir,
          `${safeOutputName(image.fileName)}.error.json`,
        )
        await writeJson(errorPath, {
          fileName: image.fileName,
          category,
          error: errorToMessage(error),
          failedAt: new Date().toISOString(),
        })
        console.error(
          `[image] ${category}/${image.fileName}: failed, continuing. ${errorToMessage(error)}`,
        )
      }
    }

    if (analyses.length === 0) {
      console.log(`[category] ${category}: no successful analyses, skipping aggregation.`)
      summaries.push({
        category,
        referenceImageCount: images.length,
        successfulAnalysisCount: 0,
      })
      continue
    }

    console.log(`[category] ${category}: aggregating ${analyses.length} analyses`)
    const designSystem = await aggregateCategoryDesignSystem(
      config,
      category,
      analyses,
      rawResponseDir,
    )
    const generatedJsonPath = path.join(
      categoryOutputDir,
      `${category}.generated-design-system.json`,
    )
    const appSeedPath = path.join(appDesignSystemRoot, categoryFileNames[category])
    const manifestPath = path.join(categoryOutputDir, `${category}.manifest.json`)
    const publicAssets = await createPublicReferenceAssets(category, images, analyses)
    const buildMetadata = createBuildMetadata({
      category,
      images,
      analyses,
      analysisPathByFileName,
      generatedJsonPath,
      appSeedPath,
      manifestPath,
      publicAssets,
    })

    const tracedDesignSystem = attachBuildMetadata(designSystem, buildMetadata)
    await writeJson(generatedJsonPath, tracedDesignSystem)
    await writeJson(manifestPath, createManifest(category, tracedDesignSystem, buildMetadata))

    if (buildMetadata.analysisCompleteness.status === 'incomplete') {
      console.warn(
        'Design system analysis is incomplete. Additional reference analysis is required before replacing app JSON.',
      )
    } else if (
      buildMetadata.analysisCompleteness.status === 'partial' &&
      buildMetadata.aggregationSummary.completeReferenceImages < 2
    ) {
      console.warn(
        'Design system analysis is partial and fewer than 2 reference images are complete. App JSON was not replaced.',
      )
    } else {
      await writeJson(appSeedPath, tracedDesignSystem)
    }

    console.log(`[category] ${category}: aggregation complete`)
    console.log(`[output] ${path.relative(repoRoot, generatedJsonPath)}`)
    console.log(`[seed] ${path.relative(repoRoot, appSeedPath)}`)

    summaries.push({
      category,
      referenceImageCount: images.length,
      successfulAnalysisCount: analyses.length,
      generatedJsonPath: path.relative(repoRoot, generatedJsonPath),
      appSeedPath:
        buildMetadata.analysisCompleteness.status === 'incomplete'
          ? undefined
          : path.relative(repoRoot, appSeedPath),
    })
  }

  console.log('\nKmong beauty design system build complete.')
  console.table(summaries)
}

async function loadConfig(): Promise<EnvConfig> {
  const env = await loadEnvLocal()
  const apiKey = env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY
  const model = env.VITE_OPENROUTER_ANALYSIS_MODEL || 'openai/gpt-4o-mini'

  if (!apiKey) {
    throw new Error(
      'Missing OpenRouter API key. Add OPENROUTER_API_KEY or VITE_OPENROUTER_API_KEY to .env.local.',
    )
  }

  return { apiKey, model }
}

async function loadEnvLocal(): Promise<Record<string, string>> {
  const envPath = path.join(repoRoot, '.env.local')
  const values: Record<string, string> = {}

  try {
    const contents = await readFile(envPath, 'utf8')
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) {
        continue
      }

      const key = trimmed.slice(0, separatorIndex).trim()
      const value = trimmed.slice(separatorIndex + 1).trim()
      values[key] = stripEnvQuotes(value)
    }
  } catch (error) {
    if (!isNodeErrorCode(error, 'ENOENT')) {
      throw error
    }
  }

  return {
    ...values,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || values.OPENROUTER_API_KEY,
    VITE_OPENROUTER_API_KEY:
      process.env.VITE_OPENROUTER_API_KEY || values.VITE_OPENROUTER_API_KEY,
    VITE_OPENROUTER_ANALYSIS_MODEL:
      process.env.VITE_OPENROUTER_ANALYSIS_MODEL ||
      values.VITE_OPENROUTER_ANALYSIS_MODEL,
  }
}

function stripEnvQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

async function readCategoryImages(category: BeautyCategory): Promise<ReferenceImage[]> {
  const categoryDir = path.join(referenceRoot, category)
  const dirEntries = await readdir(categoryDir, { withFileTypes: true })

  return dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const extension = path.extname(entry.name).toLowerCase()
      const mimeType = imageMimeTypes.get(extension)

      if (!mimeType) {
        return null
      }

      return {
        category,
        fileName: entry.name,
        path: path.join(categoryDir, entry.name),
        mimeType,
      }
    })
    .filter((image): image is ReferenceImage => Boolean(image))
    .sort((first, second) => first.fileName.localeCompare(second.fileName))
}

async function analyzeImage(
  config: EnvConfig,
  image: ReferenceImage,
): Promise<ImageAnalysis> {
  const imageDataUrl = await imageToDataUrl(image)
  const content = await callOpenRouterJson(config, [
    {
      type: 'text',
      text: buildImageAnalysisPrompt(image.category, image.fileName),
    },
    {
      type: 'image_url',
      image_url: { url: imageDataUrl },
    },
  ])

  return parseJsonResponse<ImageAnalysis>(content, (raw) =>
    normalizeImageAnalysis(image, raw),
  )
}

async function aggregateCategoryDesignSystem(
  config: EnvConfig,
  category: BeautyCategory,
  analyses: ImageAnalysis[],
  rawResponseDir: string,
): Promise<GeneratedDesignSystem> {
  const content = await callOpenRouterJson(config, [
    {
      type: 'text',
      text: buildAggregationPrompt(category, analyses),
    },
  ])

  try {
    return parseJsonResponse<GeneratedDesignSystem>(content, (raw) =>
      normalizeGeneratedDesignSystem(category, analyses.length, raw),
    )
  } catch (error) {
    const rawPath = path.join(rawResponseDir, `${category}.aggregation.raw.txt`)
    await writeFile(rawPath, content)
    throw new Error(
      `Failed to parse aggregation JSON for ${category}. Raw response saved to ${path.relative(
        repoRoot,
        rawPath,
      )}. ${errorToMessage(error)}`,
      { cause: error },
    )
  }
}

async function imageToDataUrl(image: ReferenceImage) {
  const buffer = await readFile(image.path)
  return `data:${image.mimeType};base64,${buffer.toString('base64')}`
}

async function callOpenRouterJson(
  config: EnvConfig,
  content: OpenRouterMessageContent[],
) {
  const response = await fetch(openRouterUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Kmong Beauty Design System Builder',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.2,
      response_format: {
        type: 'json_object',
      },
    }),
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(
      `OpenRouter request failed with ${response.status} ${response.statusText}: ${redactPotentialSecrets(
        responseText,
      )}`,
    )
  }

  const payload = parseJsonResponse<OpenRouterResponse>(responseText, (raw) => raw)
  const contentText = payload.choices?.[0]?.message?.content

  if (!contentText) {
    throw new Error('OpenRouter response did not include message content.')
  }

  return contentText
}

function buildImageAnalysisPrompt(category: BeautyCategory, fileName: string) {
  return [
    `Analyze this Kmong beauty ecommerce detail page reference image for category "${category}" (${fileName}).`,
    'Return strict JSON only. Do not use Markdown.',
    'Fully analyze all visible design elements in the image. Extract design-system evidence from the image, not generic ecommerce advice.',
    'Use concise but specific Korean or English strings. Prefer observable page patterns.',
    'Return exactly this JSON shape:',
    '{',
    '  "fullDesignElementAnalysis": {',
    ...requiredDesignElementFields.map((field) => `    "${field}": string[],`),
    '  },',
    '  "reusablePatterns": string[],',
    '  "extractionNotes": string[],',
    '  "layoutStructure": string[],',
    '  "sectionOrder": string[],',
    '  "heroSectionStyle": string[],',
    '  "typographyStyle": string[],',
    '  "colorPalette": string[],',
    '  "spacingPattern": string[],',
    '  "visualHierarchy": string[],',
    '  "ctaPlacement": string[],',
    '  "trustElements": string[],',
    '  "productVisualTreatment": string[],',
    '  "iconBadgeUsage": string[],',
    '  "commerceConversionPatterns": string[],',
    '  "strengths": string[],',
    '  "reusableDesignRules": string[]',
    '}',
    'Every key inside fullDesignElementAnalysis is required. Use ["not present in reference image"] only for optional sections that are genuinely absent.',
  ].join('\n')
}

function buildAggregationPrompt(category: BeautyCategory, analyses: ImageAnalysis[]) {
  return [
    `Create a generated category design system for Kmong beauty category "${category}".`,
    'Aggregate common patterns across the provided per-image analyses.',
    'Return strict JSON only. Do not use Markdown.',
    'The output must be immediately usable as src/data/beauty-design-systems/<category>.json.',
    'Include all required fields and preserve app-compatible fields.',
    'Return exactly this JSON shape:',
    '{',
    '  "category": string,',
    '  "displayName": string,',
    '  "sourceType": "kmong_reference_analysis",',
    '  "sourceStatus": "generated_from_reference_images",',
    '  "version": string,',
    '  "generatedAt": string,',
    '  "referenceImageCount": number,',
    '  "positioning": string,',
    '  "coreDesignPrinciples": string[],',
    '  "layoutRules": string[],',
    '  "heroSectionRules": string[],',
    '  "typographyRules": string[],',
    '  "colorRules": string[],',
    '  "sectionPatterns": string[],',
    '  "conversionRules": string[],',
    '  "trustElementRules": string[],',
    '  "visualTreatmentRules": string[],',
    '  "doRules": string[],',
    '  "avoidRules": string[],',
    '  "promptGuidance": string,',
    '  "typography": { "headline": string, "body": string, "label": string },',
    '  "colors": { "primary": string, "secondary": string, "accent": string, "background": string, "surface": string, "text": string },',
    '  "contentBlocks": string[],',
    '  "imageDirection": string[],',
    '  "conversionCues": string[]',
    '}',
    '',
    'Per-image analyses:',
    JSON.stringify(analyses, null, 2),
  ].join('\n')
}

function parseJsonResponse<T>(
  content: string,
  normalize: (raw: Record<string, unknown>) => T,
) {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  const parsed = JSON.parse(withoutFence)

  if (!isRecord(parsed)) {
    throw new Error('Parsed JSON was not an object.')
  }

  return normalize(parsed)
}

function normalizeImageAnalysis(
  image: ReferenceImage,
  raw: Record<string, unknown>,
): ImageAnalysis {
  const fullDesignElementAnalysis = normalizeFullDesignElementAnalysis(raw)
  const missingDesignElementFields = requiredDesignElementFields.filter(
    (field) => fullDesignElementAnalysis[field].length === 0,
  )
  const analysisCompletenessScore = roundScore(
    (requiredDesignElementFields.length - missingDesignElementFields.length) /
      requiredDesignElementFields.length,
  )
  const requiresAdditionalAnalysis =
    missingDesignElementFields.length > 0 || analysisCompletenessScore < 0.85
  const analysisStatus: AnalysisStatus = requiresAdditionalAnalysis
    ? 'incomplete'
    : 'complete'

  return {
    fileName: image.fileName,
    category: image.category,
    analysisStatus,
    analysisCompletenessScore,
    missingDesignElementFields,
    requiresAdditionalAnalysis,
    fullDesignElementAnalysis,
    reusablePatterns: asStringArray(raw.reusablePatterns),
    extractionNotes: asStringArray(raw.extractionNotes),
    layoutStructure: asStringArray(raw.layoutStructure),
    sectionOrder: asStringArray(raw.sectionOrder),
    heroSectionStyle: asStringArray(raw.heroSectionStyle),
    typographyStyle: asStringArray(raw.typographyStyle),
    colorPalette: asStringArray(raw.colorPalette),
    spacingPattern: asStringArray(raw.spacingPattern),
    visualHierarchy: asStringArray(raw.visualHierarchy),
    ctaPlacement: asStringArray(raw.ctaPlacement),
    trustElements: asStringArray(raw.trustElements),
    productVisualTreatment: asStringArray(raw.productVisualTreatment),
    iconBadgeUsage: asStringArray(raw.iconBadgeUsage),
    commerceConversionPatterns: asStringArray(raw.commerceConversionPatterns),
    strengths: asStringArray(raw.strengths),
    reusableDesignRules: asStringArray(raw.reusableDesignRules),
  }
}

function normalizeFullDesignElementAnalysis(
  raw: Record<string, unknown>,
): FullDesignElementAnalysis {
  const source = asRecord(raw.fullDesignElementAnalysis)
  const fallbackByField: Record<string, unknown> = {
    overallLayoutStructure: raw.layoutStructure,
    sectionOrder: raw.sectionOrder,
    heroSectionStyle: raw.heroSectionStyle,
    headlineStyle: raw.typographyStyle,
    subheadlineStyle: raw.typographyStyle,
    bodyTextStyle: raw.typographyStyle,
    typographyHierarchy: raw.typographyStyle,
    colorPalette: raw.colorPalette,
    spacingRhythm: raw.spacingPattern,
    ctaButtonStyle: raw.ctaPlacement,
    trustProofElementStyle: raw.trustElements,
    productVisualTreatment: raw.productVisualTreatment,
    iconStyle: raw.iconBadgeUsage,
    badgeLabelStyle: raw.iconBadgeUsage,
    commerceConversionPatterns: raw.commerceConversionPatterns,
    visualHierarchy: raw.visualHierarchy,
    reusableDesignRules: raw.reusableDesignRules,
    strengths: raw.strengths,
  }

  return Object.fromEntries(
    requiredDesignElementFields.map((field) => [
      field,
      asStringArray(source[field], fallbackByField[field]),
    ]),
  ) as FullDesignElementAnalysis
}

function normalizeGeneratedDesignSystem(
  category: BeautyCategory,
  referenceImageCount: number,
  raw: Record<string, unknown>,
): GeneratedDesignSystem {
  const typography = asRecord(raw.typography)
  const colors = asRecord(raw.colors)

  return {
    category,
    displayName: asString(raw.displayName, categoryDisplayNames[category]),
    sourceType: 'kmong_reference_analysis',
    sourceStatus: 'generated_from_reference_images',
    version: asString(raw.version, '1.0.0'),
    generatedAt: new Date().toISOString(),
    generatedFromBuilder: true,
    designSystemJsonPath: '',
    referenceImageCount,
    referenceSources: [],
    analysisSourceFiles: [],
    analysisCompleteness: {
      status: 'incomplete',
      averageCompletenessScore: 0,
      requiresAdditionalAnalysis: true,
      incompleteReferenceFiles: [],
      missingCommonFields: [],
    },
    missingAnalysisWarnings: [],
    aggregationSummary: {
      totalReferenceImagesFound: referenceImageCount,
      totalReferenceImagesIncluded: referenceImageCount,
      totalImageAnalysesUsed: referenceImageCount,
      completeReferenceImages: 0,
      incompleteReferenceImages: referenceImageCount,
      generatedDesignSystemJsonPath: '',
      manifestPath: '',
    },
    referenceAnalysisTrace: [],
    publicReferenceAssetsBasePath: '',
    publicReferenceImagePaths: [],
    referenceContactSheetGenerated: false,
    referenceContactSheetMode: 'cropped_grid',
    referenceContactSheetTileCount: 0,
    referenceContactSheetCropStrategy: 'hero_middle_lower',
    contactSheetReadableForGeneration: false,
    referenceImageCountAvailableForGeneration: 0,
    referenceImagesPassedToGenerationDefault: [],
    positioning: asString(raw.positioning, `${categoryDisplayNames[category]} Kmong reference design system.`),
    coreDesignPrinciples: asStringArray(raw.coreDesignPrinciples),
    layoutRules: asStringArray(raw.layoutRules),
    heroSectionRules: asStringArray(raw.heroSectionRules),
    typographyRules: asStringArray(raw.typographyRules),
    colorRules: asStringArray(raw.colorRules),
    sectionPatterns: asStringArray(raw.sectionPatterns),
    conversionRules: asStringArray(raw.conversionRules),
    trustElementRules: asStringArray(raw.trustElementRules),
    visualTreatmentRules: asStringArray(raw.visualTreatmentRules),
    doRules: asStringArray(raw.doRules),
    avoidRules: asStringArray(raw.avoidRules),
    promptGuidance: asString(raw.promptGuidance, ''),
    typography: {
      headline: asString(typography.headline, 'High-contrast ecommerce headline typography'),
      body: asString(typography.body, 'Readable product-detail body typography'),
      label: asString(typography.label, 'Compact labels for benefits, badges, and proof points'),
    },
    colors: {
      primary: asHexColor(colors.primary, '#2F6F63'),
      secondary: asHexColor(colors.secondary, '#A8D5C4'),
      accent: asHexColor(colors.accent, '#F2B880'),
      background: asHexColor(colors.background, '#F7FAF7'),
      surface: asHexColor(colors.surface, '#FFFFFF'),
      text: asHexColor(colors.text, '#1E2A27'),
    },
    contentBlocks: asStringArray(raw.contentBlocks, raw.sectionPatterns),
    imageDirection: asStringArray(raw.imageDirection, raw.visualTreatmentRules),
    conversionCues: asStringArray(raw.conversionCues, raw.conversionRules),
  }
}

function createBuildMetadata({
  category,
  images,
  analyses,
  analysisPathByFileName,
  generatedJsonPath,
  appSeedPath,
  manifestPath,
  publicAssets,
}: {
  category: BeautyCategory
  images: ReferenceImage[]
  analyses: ImageAnalysis[]
  analysisPathByFileName: Map<string, string>
  generatedJsonPath: string
  appSeedPath: string
  manifestPath: string
  publicAssets: PublicReferenceAssets
}): BuildMetadata {
  const generatedDesignSystemJsonPath = path.relative(repoRoot, generatedJsonPath)
  const copiedAppJsonPath = path.relative(repoRoot, appSeedPath)
  const relativeManifestPath = path.relative(repoRoot, manifestPath)
  const analysisByFileName = new Map(
    analyses.map((analysis) => [analysis.fileName, analysis]),
  )
  const analysisSourceFiles = analyses.map((analysis) => {
    const relativePath =
      analysisPathByFileName.get(analysis.fileName) ||
      path.join(
        'outputs',
        'design-system-builder',
        category,
        'image-analyses',
        `${safeOutputName(analysis.fileName)}.analysis.json`,
      )

    return {
      fileName: path.basename(relativePath),
      relativePath,
      sourceReferenceFile: analysis.fileName,
      analysisStatus: analysis.analysisStatus,
      coversRequiredDesignElements: !analysis.requiresAdditionalAnalysis,
    }
  })
  const referenceSources = images.map((image) => {
    const analysis = analysisByFileName.get(image.fileName)

    return {
      fileName: image.fileName,
      relativePath: path.relative(repoRoot, image.path),
      includedInAggregation: Boolean(analysis),
      analysisStatus: analysis?.analysisStatus ?? 'incomplete',
      analysisCompletenessScore: analysis?.analysisCompletenessScore ?? 0,
      requiresAdditionalAnalysis: analysis?.requiresAdditionalAnalysis ?? true,
    }
  })
  const analysisCompleteness = createCategoryAnalysisCompleteness(images, analyses)
  const missingAnalysisWarnings = createMissingAnalysisWarnings(
    analyses,
    analysisCompleteness,
  )
  const completeReferenceImages = analyses.filter(
    (analysis) => analysis.analysisStatus === 'complete',
  ).length
  const incompleteReferenceImages = images.length - completeReferenceImages

  return {
    generatedDesignSystemJsonPath,
    appSeedPath: copiedAppJsonPath,
    manifestPath: relativeManifestPath,
    referenceSources,
    analysisSourceFiles,
    analysisCompleteness,
    missingAnalysisWarnings,
    referenceAnalysisTrace: referenceSources.map((source) => {
      const analysis = analysisByFileName.get(source.fileName)
      const analysisSourceFile = analysisSourceFiles.find(
        (file) => file.sourceReferenceFile === source.fileName,
      )

      return {
        fileName: source.fileName,
        missingDesignElementFields: analysis?.missingDesignElementFields ?? [
          ...requiredDesignElementFields,
        ],
        analysisSourceFile,
      }
    }),
    publicReferenceAssetsBasePath: publicAssets.basePath,
    publicReferenceImagePaths: publicAssets.imagePaths,
    publicReferenceContactSheetPath: publicAssets.contactSheetPath,
    referenceContactSheetGenerated: publicAssets.contactSheetGenerated,
    referenceContactSheetMode: publicAssets.contactSheetMode,
    referenceContactSheetTileCount: publicAssets.contactSheetTileCount,
    referenceContactSheetCropStrategy: publicAssets.contactSheetCropStrategy,
    contactSheetDimensions: publicAssets.contactSheetDimensions,
    contactSheetReadableForGeneration: publicAssets.contactSheetReadableForGeneration,
    referenceImageCountAvailableForGeneration:
      publicAssets.imageCountAvailableForGeneration,
    referenceImagesPassedToGenerationDefault: publicAssets.defaultImagePaths,
    aggregationSummary: {
      totalReferenceImagesFound: images.length,
      totalReferenceImagesIncluded: analyses.length,
      totalImageAnalysesUsed: analyses.length,
      completeReferenceImages,
      incompleteReferenceImages,
      generatedDesignSystemJsonPath,
      copiedAppJsonPath:
        analysisCompleteness.status === 'incomplete' ? undefined : copiedAppJsonPath,
      manifestPath: relativeManifestPath,
      publicReferenceAssetsBasePath: publicAssets.basePath,
      publicReferenceContactSheetPath: publicAssets.contactSheetPath,
      referenceContactSheetGenerated: publicAssets.contactSheetGenerated,
      referenceContactSheetMode: publicAssets.contactSheetMode,
      referenceContactSheetTileCount: publicAssets.contactSheetTileCount,
      referenceContactSheetCropStrategy: publicAssets.contactSheetCropStrategy,
      contactSheetDimensions: publicAssets.contactSheetDimensions,
      contactSheetReadableForGeneration: publicAssets.contactSheetReadableForGeneration,
    },
  }
}

async function createPublicReferenceAssets(
  category: BeautyCategory,
  images: ReferenceImage[],
  analyses: ImageAnalysis[],
): Promise<PublicReferenceAssets> {
  const categoryPublicDir = path.join(publicReferenceAssetsRoot, category)
  const referencePublicDir = path.join(categoryPublicDir, 'references')
  await mkdir(referencePublicDir, { recursive: true })

  const analysisByFileName = new Map(
    analyses.map((analysis) => [analysis.fileName, analysis]),
  )
  const selectedImages = images
    .filter((image) => {
      const analysis = analysisByFileName.get(image.fileName)
      return analysis?.analysisStatus === 'complete'
    })
    .sort((first, second) => {
      const firstScore = analysisByFileName.get(first.fileName)?.analysisCompletenessScore ?? 0
      const secondScore = analysisByFileName.get(second.fileName)?.analysisCompletenessScore ?? 0
      return secondScore - firstScore
    })
    .slice(0, 3)

  const publicImagePaths: string[] = []

  for (const image of selectedImages) {
    const destinationPath = path.join(referencePublicDir, image.fileName)
    await copyFile(image.path, destinationPath)
    publicImagePaths.push(
      `/generated-reference-assets/kmong-beauty/${category}/references/${image.fileName}`,
    )
  }

  const contactSheetPath =
    selectedImages.length > 0
      ? `/generated-reference-assets/kmong-beauty/${category}/${category}-contact-sheet.jpg`
      : undefined

  if (selectedImages.length > 0) {
    await createReferenceContactSheet(
      selectedImages,
      path.join(categoryPublicDir, `${category}-contact-sheet.jpg`),
    )
  }

  return {
    basePath: `/generated-reference-assets/kmong-beauty/${category}/`,
    imagePaths: publicImagePaths,
    contactSheetPath,
    contactSheetGenerated: selectedImages.length > 0,
    contactSheetMode: 'cropped_grid',
    contactSheetTileCount: selectedImages.length * 3,
    contactSheetCropStrategy: 'hero_middle_lower',
    contactSheetDimensions:
      selectedImages.length > 0 ? { width: 1536, height: 1536 } : undefined,
    contactSheetReadableForGeneration: selectedImages.length > 0,
    imageCountAvailableForGeneration: selectedImages.length,
    defaultImagePaths: publicImagePaths,
  }
}

async function createReferenceContactSheet(
  images: ReferenceImage[],
  outputPath: string,
) {
  const tileWidth = 480
  const tileHeight = 480
  const gap = 16
  const padding = 24
  const sheetWidth = 1536
  const sheetHeight = 1536
  const cropRegions = [
    { name: 'hero', start: 0, end: 0.28 },
    { name: 'middle', start: 0.35, end: 0.63 },
    { name: 'lower', start: 0.7, end: 1 },
  ] as const
  const composites = await Promise.all(
    images.flatMap((image, rowIndex) =>
      cropRegions.map(async (region, columnIndex) => {
        const metadata = await sharp(image.path).rotate().metadata()
        const width = metadata.width ?? tileWidth
        const height = metadata.height ?? tileHeight
        const regionTop = Math.min(
          Math.max(0, Math.floor(height * region.start)),
          Math.max(0, height - 1),
        )
        const regionHeight = Math.max(
          1,
          Math.min(height - regionTop, Math.floor(height * (region.end - region.start))),
        )
        const readableCropHeight = Math.min(
          regionHeight,
          Math.max(width, Math.floor(width * 1.15)),
        )
        const top =
          region.name === 'hero'
            ? regionTop
            : regionTop + Math.max(0, Math.floor((regionHeight - readableCropHeight) / 2))
        const input = await sharp(image.path)
          .rotate()
          .extract({ left: 0, top, width, height: readableCropHeight })
          .resize(tileWidth, tileHeight, {
            fit: 'cover',
            position: 'center',
            withoutEnlargement: false,
            background: '#ffffff',
          })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 82 })
          .toBuffer()

        return {
          input,
          left: padding + columnIndex * (tileWidth + gap),
          top: padding + rowIndex * (tileHeight + gap),
        }
      }),
    ),
  )

  await mkdir(path.dirname(outputPath), { recursive: true })
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 3,
      background: '#ffffff',
    },
  })
    .composite(composites)
    .jpeg({ quality: 82 })
    .toFile(outputPath)
}

function createCategoryAnalysisCompleteness(
  images: ReferenceImage[],
  analyses: ImageAnalysis[],
): CategoryAnalysisCompleteness {
  const averageCompletenessScore = roundScore(
    analyses.reduce((sum, analysis) => sum + analysis.analysisCompletenessScore, 0) /
      Math.max(analyses.length, 1),
  )
  const incompleteAnalyses = analyses.filter(
    (analysis) => analysis.requiresAdditionalAnalysis,
  )
  const failedReferenceFiles = images
    .filter((image) => !analyses.some((analysis) => analysis.fileName === image.fileName))
    .map((image) => image.fileName)
  const incompleteReferenceFiles = [
    ...failedReferenceFiles,
    ...incompleteAnalyses.map((analysis) => analysis.fileName),
  ]
  const missingCommonFields = requiredDesignElementFields.filter((field) =>
    analyses.some((analysis) => analysis.missingDesignElementFields.includes(field)),
  )
  const requiresAdditionalAnalysis = incompleteReferenceFiles.length > 0
  const status: AnalysisStatus =
    analyses.length === 0
      ? 'incomplete'
      : incompleteReferenceFiles.length === 0
        ? 'complete'
        : analyses.filter((analysis) => analysis.analysisStatus === 'complete').length >= 2
          ? 'partial'
          : 'incomplete'

  return {
    status,
    averageCompletenessScore,
    requiresAdditionalAnalysis,
    incompleteReferenceFiles,
    missingCommonFields,
  }
}

function createMissingAnalysisWarnings(
  analyses: ImageAnalysis[],
  analysisCompleteness: CategoryAnalysisCompleteness,
) {
  const warnings = analyses.flatMap((analysis) =>
    analysis.missingDesignElementFields.map(
      (field) => `${analysis.fileName} is missing ${field} analysis.`,
    ),
  )

  if (analysisCompleteness.requiresAdditionalAnalysis) {
    warnings.push(
      'Additional analysis is recommended before using this design system for production.',
    )
  }

  return warnings
}

function attachBuildMetadata(
  designSystem: GeneratedDesignSystem,
  metadata: BuildMetadata,
): GeneratedDesignSystem {
  return {
    ...designSystem,
    sourceStatus:
      metadata.analysisCompleteness.status === 'complete'
        ? 'generated_from_reference_images'
        : metadata.analysisCompleteness.status === 'partial'
          ? 'generated_from_reference_images_partial'
          : 'generated_from_reference_images_incomplete',
    generatedFromBuilder: true,
    designSystemJsonPath: metadata.appSeedPath,
    referenceImageCount: metadata.referenceSources.length,
    referenceSources: metadata.referenceSources,
    analysisSourceFiles: metadata.analysisSourceFiles,
    analysisCompleteness: metadata.analysisCompleteness,
    missingAnalysisWarnings: metadata.missingAnalysisWarnings,
    aggregationSummary: metadata.aggregationSummary,
    referenceAnalysisTrace: metadata.referenceAnalysisTrace,
    publicReferenceAssetsBasePath: metadata.publicReferenceAssetsBasePath,
    publicReferenceImagePaths: metadata.publicReferenceImagePaths,
    publicReferenceContactSheetPath: metadata.publicReferenceContactSheetPath,
    referenceContactSheetGenerated: metadata.referenceContactSheetGenerated,
    referenceContactSheetMode: metadata.referenceContactSheetMode,
    referenceContactSheetTileCount: metadata.referenceContactSheetTileCount,
    referenceContactSheetCropStrategy: metadata.referenceContactSheetCropStrategy,
    contactSheetDimensions: metadata.contactSheetDimensions,
    contactSheetReadableForGeneration: metadata.contactSheetReadableForGeneration,
    referenceImageCountAvailableForGeneration:
      metadata.referenceImageCountAvailableForGeneration,
    referenceImagesPassedToGenerationDefault:
      metadata.referenceImagesPassedToGenerationDefault,
  }
}

function createManifest(
  category: BeautyCategory,
  designSystem: GeneratedDesignSystem,
  metadata: BuildMetadata,
) {
  return {
    category,
    generatedAt: designSystem.generatedAt,
    generatedDesignSystemJsonPath: metadata.generatedDesignSystemJsonPath,
    copiedAppJsonPath: metadata.aggregationSummary.copiedAppJsonPath,
    referenceSources: metadata.referenceSources,
    analysisSourceFiles: metadata.analysisSourceFiles,
    analysisCompleteness: metadata.analysisCompleteness,
    missingAnalysisWarnings: metadata.missingAnalysisWarnings,
    aggregationSummary: metadata.aggregationSummary,
    publicReferenceAssetsBasePath: metadata.publicReferenceAssetsBasePath,
    publicReferenceImagePaths: metadata.publicReferenceImagePaths,
    publicReferenceContactSheetPath: metadata.publicReferenceContactSheetPath,
    referenceContactSheetGenerated: metadata.referenceContactSheetGenerated,
    referenceContactSheetMode: metadata.referenceContactSheetMode,
    referenceContactSheetTileCount: metadata.referenceContactSheetTileCount,
    referenceContactSheetCropStrategy: metadata.referenceContactSheetCropStrategy,
    contactSheetDimensions: metadata.contactSheetDimensions,
    contactSheetReadableForGeneration: metadata.contactSheetReadableForGeneration,
    referenceImageCountAvailableForGeneration:
      metadata.referenceImageCountAvailableForGeneration,
    referenceImagesPassedToGenerationDefault:
      metadata.referenceImagesPassedToGenerationDefault,
  }
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asStringArray(value: unknown, fallback?: unknown) {
  const source = Array.isArray(value) && value.length > 0 ? value : fallback

  if (!Array.isArray(source)) {
    return []
  }

  return source
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function asHexColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : fallback
}

function roundScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(value * 100) / 100
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNodeErrorCode(error: unknown, code: string) {
  return isRecord(error) && error.code === code
}

function safeOutputName(fileName: string) {
  return fileName.replace(/[^a-z0-9._-]/gi, '_')
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function redactPotentialSecrets(value: string) {
  return value.replace(/sk-or-v1-[a-z0-9]+/gi, '[redacted-openrouter-key]')
}

main().catch((error: unknown) => {
  console.error('Failed to build Kmong beauty design systems.')
  console.error(errorToMessage(error))
  process.exitCode = 1
})
