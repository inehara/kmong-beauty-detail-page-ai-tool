import { createIssueReport } from '../../core/issue/createIssueReport'
import type { DesignAnalysis } from '../../types/design-analysis'
import type { BeautyDesignSystem } from '../../types/design-system'
import type { ImprovedDesignSpec } from '../../types/improvement-spec'
import type { IssueReport } from '../../types/issue-report'
import { fitImage, loadImage } from '../../utils/imageCanvas'

type GenerateImageInput = {
  beforeImageUrl: string
  originalAnalysis: DesignAnalysis
  designSystem: BeautyDesignSystem
  spec: ImprovedDesignSpec
}

type GenerateImageResult = {
  imageUrl: string
  source: 'mock' | 'openrouter'
  status: string
  fallbackReason?: string
  referenceImagesPassedToGeneration: string[]
  referenceContactSheetPath?: string
  referenceContactSheetMode?: string
  referenceImageCountPassedToGeneration: number
  generationUsedDirectReferenceImages: boolean
  originalContentBoardGenerated: boolean
  originalContentBoardMode?: 'hero_middle_lower'
  originalContentBoardDimensions?: { width: number; height: number }
  issueReport?: IssueReport
}

type OpenRouterImageResponse = {
  choices?: Array<{
    message?: {
      content?: unknown
      images?: unknown
    }
  }>
}

type GenerationReferenceImage = {
  path: string
  dataUrl: string
  imageCount: number
  mode?: string
}

type OpenRouterHeaderConfig = {
  apiKey: string
  model: string
  referer: string
  title: string
}

const DEFAULT_OPENROUTER_IMAGE_MODEL = 'openai/gpt-5.4-image-2'
const DEFAULT_GENERATION_MODE = 'content_extraction_direct_reference_rebuild'
const OPENROUTER_IMAGE_GENERATION_TIMEOUT_MS = 360_000
const OPENROUTER_GENERATION_IMAGE_MAX_WIDTH = 768
const OPENROUTER_GENERATION_IMAGE_MAX_HEIGHT = 1536
const OPENROUTER_GENERATION_IMAGE_QUALITY = 0.78
const OPENROUTER_CONTENT_BOARD_WIDTH = 1024
const OPENROUTER_CONTENT_BOARD_HEIGHT = 1536

export async function generateImage({
  beforeImageUrl,
  originalAnalysis,
  designSystem,
  spec,
}: GenerateImageInput): Promise<GenerateImageResult> {
  const provider = import.meta.env.VITE_IMAGE_PROVIDER || 'openrouter'
  const configuredModel =
    import.meta.env.VITE_OPENROUTER_IMAGE_MODEL || DEFAULT_OPENROUTER_IMAGE_MODEL

  debugImageGeneration('active image provider', provider)
  debugImageGeneration('active image model', configuredModel || 'not configured')

  if (provider !== 'openrouter') {
    debugImageGeneration('fallback reason', 'Image provider is not openrouter.')
    return {
      imageUrl: await createMockAfterImage(beforeImageUrl, spec),
      source: 'mock',
      status: 'Fell back to mock after image.',
      fallbackReason: 'Image provider is mock or missing.',
      referenceImagesPassedToGeneration: [],
      referenceImageCountPassedToGeneration: 0,
      generationUsedDirectReferenceImages: false,
      originalContentBoardGenerated: false,
    }
  }

  const headerConfig = getOpenRouterHeaderConfig()

  if (!headerConfig) {
    debugImageGeneration('fallback reason', 'OpenRouter image config is incomplete or non-ASCII.')
    return {
      imageUrl: await createMockAfterImage(beforeImageUrl, spec),
      source: 'mock',
      status: 'Fell back to mock after image.',
      fallbackReason:
        'OpenRouter API key or image model is missing, set to mock, or contains non-ASCII characters.',
      referenceImagesPassedToGeneration: [],
      referenceImageCountPassedToGeneration: 0,
      generationUsedDirectReferenceImages: false,
      originalContentBoardGenerated: false,
    }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    OPENROUTER_IMAGE_GENERATION_TIMEOUT_MS,
  )
  let generationReferenceMetadata = {
    referenceImagesPassedToGeneration: [] as string[],
    referenceContactSheetPath: undefined as string | undefined,
    referenceContactSheetMode: undefined as string | undefined,
    referenceImageCountPassedToGeneration: 0,
    generationUsedDirectReferenceImages: false,
    originalContentBoardGenerated: false,
    originalContentBoardMode: undefined as 'hero_middle_lower' | undefined,
    originalContentBoardDimensions: undefined as { width: number; height: number } | undefined,
  }

  try {
    // TODO: Move OpenRouter image generation calls to backend API routes before real deployment.
    const originalContentSource = await createOriginalContentSourceForGeneration(beforeImageUrl)
    const referenceContactSheet = await loadReferenceContactSheetForGeneration(designSystem)
    generationReferenceMetadata = {
      referenceImagesPassedToGeneration:
        referenceContactSheet?.path ? [referenceContactSheet.path] : [],
      referenceContactSheetPath: referenceContactSheet?.path,
      referenceContactSheetMode: referenceContactSheet?.mode,
      referenceImageCountPassedToGeneration: referenceContactSheet?.imageCount ?? 0,
      generationUsedDirectReferenceImages: Boolean(referenceContactSheet),
      originalContentBoardGenerated: originalContentSource.originalContentBoardGenerated,
      originalContentBoardMode: originalContentSource.originalContentBoardMode,
      originalContentBoardDimensions: originalContentSource.originalContentBoardDimensions,
    }
    debugImageGeneration('selected reference image file names', designSystem.referenceImagesPassedToGenerationDefault ?? [])
    debugImageGeneration('contact sheet created', Boolean(referenceContactSheet))
    debugImageGeneration(
      'reference images passed to model count',
      generationReferenceMetadata.referenceImageCountPassedToGeneration,
    )
    debugImageGeneration(
      'image generation timeout value',
      OPENROUTER_IMAGE_GENERATION_TIMEOUT_MS,
    )
    debugImageGeneration('request started', {
      model: headerConfig.model,
      timeoutMs: OPENROUTER_IMAGE_GENERATION_TIMEOUT_MS,
    })
    debugImageGeneration('OpenRouter model used', headerConfig.model)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${headerConfig.apiKey}`,
        'HTTP-Referer': headerConfig.referer,
        'X-Title': headerConfig.title,
      },
      body: JSON.stringify({
        model: headerConfig.model,
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: buildImagePrompt(
                  originalAnalysis,
                  designSystem,
                  spec,
                  referenceContactSheet,
                ),
              },
              {
                type: 'image_url',
                image_url: { url: originalContentSource.dataUrl },
              },
              ...(referenceContactSheet
                ? [
                    {
                      type: 'image_url',
                      image_url: { url: referenceContactSheet.dataUrl },
                    },
                  ]
                : []),
            ],
          },
        ],
      }),
    })

    debugImageGeneration('request completed', {
      ok: response.ok,
      status: response.status,
    })

    if (!response.ok) {
      throw new Error(`OpenRouter image generation failed with HTTP ${response.status}.`)
    }

    debugImageGeneration('response received')
    debugImageGeneration('response parsing started')
    const payload = (await response.json()) as OpenRouterImageResponse
    debugOpenRouterImageResponseShape(payload)
    const imageOutput = extractImageOutput(payload)

    if (!imageOutput) {
      throw new Error(
        'OpenRouter GPT Image 2 returned HTTP 200 but no usable image output.',
      )
    }

    const imageUrl = await normalizeImageOutput(imageOutput)
    debugImageGeneration('response parsing succeeded')
    debugImageGeneration('image output parsed successfully', true)

    return {
      imageUrl,
      source: 'openrouter',
      status: 'After image generated with OpenRouter GPT Image 2.',
      ...generationReferenceMetadata,
    }
  } catch (error) {
    const normalizedError = normalizeImageGenerationError(error)
    const fallbackReason = getFallbackReason(normalizedError)
    debugImageGeneration('response parsing failed', normalizedError.message)
    debugImageGeneration('fallback reason', fallbackReason)

    const issueReport = createIssueReport({
      error: normalizedError,
      workflowStep: 'generating_after',
      context: {
        provider: 'openrouter',
        model: headerConfig.model,
        category: designSystem.category,
        analysisSource: originalAnalysis.analysisSource,
      },
    })

    return {
      imageUrl: await createMockAfterImage(beforeImageUrl, spec),
      source: 'mock',
      status: getAfterImageStatus(normalizedError),
      fallbackReason,
      ...generationReferenceMetadata,
      issueReport,
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function debugImageGeneration(event: string, details?: unknown) {
  if (details === undefined) {
    console.debug(`[OpenRouter image generation] ${event}`)
    return
  }

  console.debug(`[OpenRouter image generation] ${event}`, details)
}

function normalizeImageGenerationError(error: unknown) {
  if (isAbortError(error)) {
    return new Error(
      'OpenRouter GPT Image 2 timed out after 360 seconds even with cropped reference contact sheet.',
    )
  }

  return error instanceof Error
    ? error
    : new Error('OpenRouter image generation failed.')
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function getAfterImageStatus(error: Error) {
  if (
    error.message ===
    'OpenRouter GPT Image 2 timed out after 360 seconds even with cropped reference contact sheet.'
  ) {
    return 'OpenRouter GPT Image 2 timed out after 360 seconds even with cropped reference contact sheet.'
  }

  if (
    error.message ===
      'OpenRouter GPT Image 2 returned HTTP 200 but no usable image output.' ||
    error.message.includes('could not be loaded')
  ) {
    return 'OpenRouter image response parsing failed.'
  }

  return 'Fell back to mock after image.'
}

function getFallbackReason(error: Error) {
  if (
    error.message ===
    'OpenRouter GPT Image 2 timed out after 360 seconds even with cropped reference contact sheet.'
  ) {
    return 'OpenRouter GPT Image 2 timed out after 360 seconds even with cropped reference contact sheet.'
  }

  if (
    error.message ===
      'OpenRouter GPT Image 2 returned HTTP 200 but no usable image output.' ||
    error.message.includes('could not be loaded')
  ) {
    return error.message
  }

  return error.message
}

function getOpenRouterHeaderConfig(): OpenRouterHeaderConfig | null {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  const model = import.meta.env.VITE_OPENROUTER_IMAGE_MODEL || DEFAULT_OPENROUTER_IMAGE_MODEL
  const referer = getOpenRouterReferer()
  const title = 'Kmong Beauty Detail Page AI Tool'

  if (!apiKey || model === 'mock') {
    return null
  }

  const values = [apiKey, model, referer, title]
  if (values.some((value) => !isAscii(value))) {
    return null
  }

  return { apiKey, model, referer, title }
}

function getOpenRouterReferer() {
  const fallback = 'http://localhost:5173'
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : fallback

  return isAscii(origin) ? origin : fallback
}

async function loadReferenceContactSheetForGeneration(
  designSystem: BeautyDesignSystem,
): Promise<GenerationReferenceImage | null> {
  const contactSheetPath = designSystem.publicReferenceContactSheetPath

  if (!contactSheetPath) {
    debugImageGeneration(
      'reference contact sheet warning',
      'Reference contact sheet could not be loaded. Using JSON-only guidance.',
    )
    return null
  }

  try {
    const dataUrl = await fetchPublicImageAsDataUrl(contactSheetPath)
    return {
      path: contactSheetPath,
      dataUrl,
      imageCount: designSystem.referenceImageCountAvailableForGeneration ?? 0,
      mode: designSystem.referenceContactSheetMode,
    }
  } catch (error) {
    debugImageGeneration(
      'reference contact sheet warning',
      'Reference contact sheet could not be loaded. Using JSON-only guidance.',
    )
    debugImageGeneration('reference contact sheet load failed', {
      path: contactSheetPath,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

async function fetchPublicImageAsDataUrl(publicPath: string) {
  const normalizedPath = publicPath.replace(/\\/g, '/')
  const response = await fetch(normalizedPath)

  if (!response.ok) {
    throw new Error(`Unable to load reference image: ${normalizedPath}`)
  }

  const blob = await response.blob()
  return blobToDataUrl(blob)
}

function isAscii(value: string) {
  return [...value].every((character) => character.charCodeAt(0) <= 127)
}

async function createOriginalContentSourceForGeneration(beforeImageUrl: string) {
  const source = await loadImage(beforeImageUrl)
  const shouldCreateContentBoard =
    source.height > OPENROUTER_GENERATION_IMAGE_MAX_HEIGHT ||
    source.height / Math.max(source.width, 1) > 2.4

  if (shouldCreateContentBoard) {
    return createOriginalContentBoard(source, beforeImageUrl)
  }

  const size = fitImage(
    source.width,
    source.height,
    OPENROUTER_GENERATION_IMAGE_MAX_WIDTH,
    OPENROUTER_GENERATION_IMAGE_MAX_HEIGHT,
  )
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, size.width, size.height)

  const dataUrl = canvas.toDataURL(
    'image/jpeg',
    OPENROUTER_GENERATION_IMAGE_QUALITY,
  )

  debugImageGeneration('original image dimensions', {
    width: source.width,
    height: source.height,
  })
  debugImageGeneration('resized image dimensions', {
    width: size.width,
    height: size.height,
  })
  debugImageGeneration('original data URL size', beforeImageUrl.length)
  debugImageGeneration('resized data URL size', dataUrl.length)

  return {
    dataUrl,
    width: size.width,
    height: size.height,
    originalContentBoardGenerated: false,
    originalContentBoardMode: undefined,
    originalContentBoardDimensions: { width: size.width, height: size.height },
  }
}

function createOriginalContentBoard(source: HTMLImageElement, beforeImageUrl: string) {
  const canvas = document.createElement('canvas')
  canvas.width = OPENROUTER_CONTENT_BOARD_WIDTH
  canvas.height = OPENROUTER_CONTENT_BOARD_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const cropRegions = [
    { start: 0, end: 0.28 },
    { start: 0.35, end: 0.63 },
    { start: 0.7, end: 1 },
  ]
  const tileHeight = Math.floor(canvas.height / cropRegions.length)

  cropRegions.forEach((region, index) => {
    const sy = Math.min(
      Math.max(0, Math.floor(source.height * region.start)),
      Math.max(0, source.height - 1),
    )
    const sh = Math.max(
      1,
      Math.min(source.height - sy, Math.floor(source.height * (region.end - region.start))),
    )
    const dy = index * tileHeight
    const dh =
      index === cropRegions.length - 1 ? canvas.height - dy : tileHeight

    const regionHeight = sh
    const readableCropHeight = Math.min(
      regionHeight,
      Math.max(source.width, Math.floor(source.width * 1.2)),
    )
    const readableSourceY =
      index === 0 ? sy : sy + Math.max(0, Math.floor((regionHeight - readableCropHeight) / 2))

    drawImageCover(ctx, source, {
      sourceX: 0,
      sourceY: readableSourceY,
      sourceWidth: source.width,
      sourceHeight: readableCropHeight,
      targetX: 0,
      targetY: dy,
      targetWidth: canvas.width,
      targetHeight: dh,
    })
  })

  const dataUrl = canvas.toDataURL(
    'image/jpeg',
    OPENROUTER_GENERATION_IMAGE_QUALITY,
  )

  debugImageGeneration('original image dimensions', {
    width: source.width,
    height: source.height,
  })
  debugImageGeneration('original content board generated', true)
  debugImageGeneration('original content board dimensions', {
    width: canvas.width,
    height: canvas.height,
  })
  debugImageGeneration('original data URL size', beforeImageUrl.length)
  debugImageGeneration('content board data URL size', dataUrl.length)

  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    originalContentBoardGenerated: true,
    originalContentBoardMode: 'hero_middle_lower' as const,
    originalContentBoardDimensions: { width: canvas.width, height: canvas.height },
  }
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  options: {
    sourceX: number
    sourceY: number
    sourceWidth: number
    sourceHeight: number
    targetX: number
    targetY: number
    targetWidth: number
    targetHeight: number
  },
) {
  const sourceRatio = options.sourceWidth / options.sourceHeight
  const targetRatio = options.targetWidth / options.targetHeight
  const drawWidth =
    sourceRatio > targetRatio
      ? Math.round(options.targetHeight * sourceRatio)
      : options.targetWidth
  const drawHeight =
    sourceRatio > targetRatio
      ? options.targetHeight
      : Math.round(options.targetWidth / sourceRatio)
  const drawX = options.targetX + Math.round((options.targetWidth - drawWidth) / 2)
  const drawY = options.targetY + Math.round((options.targetHeight - drawHeight) / 2)

  ctx.drawImage(
    image,
    options.sourceX,
    options.sourceY,
    options.sourceWidth,
    options.sourceHeight,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  )
}

function buildImagePrompt(
  originalAnalysis: DesignAnalysis,
  designSystem: BeautyDesignSystem,
  spec: ImprovedDesignSpec,
  referenceContactSheet: GenerationReferenceImage | null,
) {
  return [
    'Generate and return one final redesigned beauty ecommerce detail page image.',
    'Do not return only text.',
    `Generation mode: ${spec.generationMode || DEFAULT_GENERATION_MODE}.`,
    `Reference contact sheet passed: ${referenceContactSheet?.path ?? 'none'}.`,
    `Reference images represented in contact sheet: ${referenceContactSheet?.imageCount ?? 0}.`,
    '',
    'TOP-LEVEL INSTRUCTION:',
    'The first image is the original content source. Use it for product facts, brand context, and key assets.',
    referenceContactSheet
      ? 'The second image is the cropped Kmong reference contact sheet. Use it as the primary visual design reference.'
      : 'No reference contact sheet was loaded, so use the JSON design system guidance only.',
    'Original content board: Use this image only to extract content, product facts, key visuals, benefits, claims, and brand context. Do not copy its layout.',
    'Reference contact sheet: Use this cropped reference contact sheet as the primary visual design source. Follow its layout rhythm, card styles, section grouping, CTA styling, typography hierarchy, spacing, and premium commerce polish.',
    'Use the uploaded original image as the source of truth for content, facts, and important visual assets.',
    'Preserve the original content meaning and important information.',
    'Do not invent unsupported claims, ingredients, reviews, prices, or effects.',
    'Do not treat the original image as the visual layout reference.',
    'Do not use the original image as the visual layout template.',
    'Do not simply edit or lightly restyle the original image.',
    'Do not create a lightly edited version of the original image.',
    'Extract the content, product visuals, brand context, and key selling points from the original image.',
    'Extract the original content, then rebuild the page in the Kmong reference design language.',
    'Rebuild the detail page from scratch using the selected Kmong reference design system.',
    'The final page should feel structurally and visually different from the original.',
    'Only the content and key product/brand assets should remain recognizable.',
    '',
    'Use the selected category design system as the source of truth for layout structure and visual presentation.',
    'Use the selected Kmong category design system as the source of truth for layout structure and visual presentation.',
    'Use the provided Kmong reference image(s) and selected category design system as the visual design source of truth.',
    'Strongly redesign the page so it feels like a high-quality Kmong-style detail page built from the original content.',
    'The visual layout, spacing, card system, section grouping, CTA design, and hierarchy should follow the selected Kmong reference design system strongly.',
    'Rebuild the detail page using the visual rhythm, section styling, typography, spacing, and card structure shown in the reference style sheet.',
    'The reference contact sheet is the visual style source of truth.',
    'Apply the reference design system strongly to layout structure, hero section composition, section sequencing if needed for better clarity, typography, spacing, composition polish, section styling, CTA styling, trust blocks, card styling, visual grouping, and color treatment.',
    'If there is conflict between preserving original layout and applying the Kmong reference design system, prioritize the Kmong reference design system layout while preserving the original content meaning.',
    'Do not copy the original composition. Recompose the page.',
    'The result should look like a professional designer rebuilt the same product page using the Kmong reference design language.',
    'Create a new polished mobile commerce detail page using the original content and the reference design language.',
    'The output should look like a new professional detail page designed from the original content.',
    'The output should visually resemble the provided Kmong reference style more than the original layout.',
    '',
    'The result should preserve the original content, but visually and structurally feel significantly redesigned.',
    'The result should look like a much more professionally redesigned Kmong-style page built from the same original content, not a completely unrelated new page.',
    '',
    'REFERENCE STYLE INFLUENCE:',
    buildReferenceStyleInfluenceInstruction(spec.referenceStyleInfluence),
    '',
    'STEP 1 - EXTRACT ORIGINAL CONTENT:',
    '- Extract product name.',
    '- Extract brand name and brand/product context.',
    '- Extract key visuals and key product/brand assets.',
    '- Extract benefit claims, product features, and key selling points.',
    '- Extract usage, proof, texture, color, comparison, and before/after information if present.',
    '- Extract existing CTA or sales information if present.',
    '',
    'STEP 2 - IGNORE ORIGINAL LAYOUT STYLING:',
    '- Do not preserve the original layout.',
    '- Do not preserve original section composition.',
    '- Do not preserve original spacing rhythm.',
    '- Do not preserve original typography treatment.',
    '- Do not preserve original card or block style.',
    '- Do not use the uploaded image as a composition template.',
    '',
    'STEP 3 - REBUILD WITH KMONG REFERENCE DESIGN SYSTEM:',
    '- Create a new commerce detail-page structure.',
    '- Strongly apply the selected category design system.',
    '- Use stronger hero section composition.',
    '- Use better section hierarchy.',
    '- Use card-based information blocks.',
    '- Use more polished typography.',
    '- Use more premium spacing.',
    '- Use CTA/button styling from the design system.',
    '- Use trust/benefit/proof blocks from the design system.',
    '- Use a clearer mobile commerce visual rhythm.',
    '',
    'CONTENT SAFETY RULES:',
    '- Do not invent unsupported claims, ingredients, reviews, prices, effects, certifications, or guarantees.',
    '- Do not invent unsupported clinical claims, fake reviews, fake prices, fake discounts, fake before/after effects, medical claims, or legal claims.',
    '- Do not invent clinical effects.',
    '- Do not remove important original information.',
    '- Do not distort original content meaning.',
    '- Preserve content roles even if the layout changes.',
    '',
    'OUTPUT CANVAS RULES:',
    '- Use the full canvas. Do not add black side bars. Do not letterbox. Do not create a screenshot mockup.',
    '- Create a vertical mobile commerce detail page.',
    '- Do not squeeze the final page into a tiny poster.',
    '- Do not add black side bars.',
    '- Use the full vertical canvas.',
    '- Avoid poster-like scaling, browser frames, phone mockup frames, or tiny centered screenshots.',
    '- Maintain a clean background and readable visual hierarchy.',
    '',
    'selected Kmong reference design system style directives:',
    JSON.stringify(buildDesignSystemPromptPayload(designSystem), null, 2),
    '',
    'original_analysis.json:',
    JSON.stringify(
      {
        summary: originalAnalysis.summary,
        targetCustomer: originalAnalysis.targetCustomer,
        currentStrengths: originalAnalysis.currentStrengths,
        improvementOpportunities: originalAnalysis.improvementOpportunities,
        layout: originalAnalysis.layout,
        typography: originalAnalysis.typography,
        colorPalette: originalAnalysis.colorPalette,
        visualHierarchy: originalAnalysis.visualHierarchy,
        conversionIssues: originalAnalysis.conversionIssues,
        recommendedDirection: originalAnalysis.recommendedDirection,
      },
      null,
      2,
    ),
    '',
    'improved_design_spec.json:',
    JSON.stringify(spec, null, 2),
  ].join('\n')
}

function buildReferenceStyleInfluenceInstruction(
  influence: ImprovedDesignSpec['referenceStyleInfluence'],
) {
  const instructions: Record<ImprovedDesignSpec['referenceStyleInfluence'], string> = {
    low: 'Influence low: preserve more of the original layout and styling while applying light Kmong reference polish.',
    medium:
      'Influence medium: preserve original content strongly, but allow moderate structural redesign toward the selected Kmong reference style.',
    high: 'Influence high: original layout fidelity should be low; content preservation should be high; reference layout and style influence should be very high; the result should look significantly redesigned. Strongly apply the selected category design system to layout styling, typography treatment, spacing system, section styling, CTA styling, trust styling, card styling, and color treatment. The output should not merely restyle the original lightly; it should look newly rebuilt according to the selected Kmong reference style.',
  }

  return instructions[influence]
}

function buildDesignSystemPromptPayload(designSystem: BeautyDesignSystem) {
  return {
    category: designSystem.category,
    displayName: designSystem.displayName,
    sourceType: designSystem.sourceType,
    sourceStatus: designSystem.sourceStatus,
    referenceImageCount: designSystem.referenceImageCount,
    positioning: designSystem.positioning,
    coreDesignPrinciples: designSystem.coreDesignPrinciples ?? [],
    layoutRules: designSystem.layoutRules,
    heroSectionRules: designSystem.heroSectionRules ?? [],
    typographyRules: designSystem.typographyRules ?? [],
    colorRules: designSystem.colorRules ?? [],
    sectionPatterns: designSystem.sectionPatterns ?? [],
    conversionRules: designSystem.conversionRules ?? [],
    trustElementRules: designSystem.trustElementRules ?? [],
    visualTreatmentRules: designSystem.visualTreatmentRules ?? [],
    doRules: designSystem.doRules ?? [],
    avoidRules: designSystem.avoidRules ?? [],
    promptGuidance: designSystem.promptGuidance,
    typography: designSystem.typography,
    colors: designSystem.colors,
    contentBlocks: designSystem.contentBlocks,
    imageDirection: designSystem.imageDirection,
    conversionCues: designSystem.conversionCues,
  }
}

function extractImageOutput(payload: unknown): string | null {
  const candidates = [
    ...collectOpenRouterMessageImages(payload),
    ...collectOpenRouterContentImageParts(payload),
    ...collectImageCandidates(payload),
  ]
  return candidates[0] || null
}

function debugOpenRouterImageResponseShape(payload: unknown) {
  if (!isRecord(payload)) {
    debugImageGeneration('response top-level keys', [])
    debugImageGeneration('whether choices[0].message.images exists', false)
    debugImageGeneration('number of images found', 0)
    debugImageGeneration('whether image_url.url was found', false)
    return
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : []
  const firstMessage = getChoiceMessage(choices[0])
  const firstImages = firstMessage && Array.isArray(firstMessage.images)
  const messageImages = collectOpenRouterMessageImageItems(payload)
  const imageUrlUrlFound = messageImages.some((image) => {
    if (!isRecord(image)) {
      return false
    }

    return isRecord(image.image_url) && typeof image.image_url.url === 'string'
  })

  debugImageGeneration('response top-level keys', Object.keys(payload))
  debugImageGeneration('whether choices[0].message.images exists', Boolean(firstImages))
  debugImageGeneration('number of images found', messageImages.length)
  debugImageGeneration('whether image_url.url was found', imageUrlUrlFound)
}

function collectOpenRouterMessageImages(payload: unknown) {
  return collectOpenRouterMessageImageItems(payload)
    .map((image) => extractImageUrlValue(image))
    .filter((url): url is string => Boolean(url))
}

function collectOpenRouterMessageImageItems(payload: unknown): unknown[] {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return []
  }

  return payload.choices.flatMap((choice) => {
    const message = getChoiceMessage(choice)
    if (!message || !Array.isArray(message.images)) {
      return []
    }

    return message.images
  })
}

function collectOpenRouterContentImageParts(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return []
  }

  return payload.choices.flatMap((choice) => {
    const message = getChoiceMessage(choice)
    const content = message?.content

    if (!Array.isArray(content)) {
      return []
    }

    return content
      .map((part) => extractImageUrlValue(part))
      .filter((url): url is string => Boolean(url))
  })
}

function getChoiceMessage(choice: unknown) {
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return null
  }

  return choice.message
}

function extractImageUrlValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return isUsableImageReference(value) ? value : null
  }

  if (!isRecord(value)) {
    return null
  }

  const directUrl = value.url
  if (typeof directUrl === 'string' && isUsableImageReference(directUrl)) {
    return directUrl
  }

  const b64Json = value.b64_json
  if (typeof b64Json === 'string' && looksLikeBase64Image(b64Json)) {
    return b64Json
  }

  const imageUrl = value.image_url
  if (typeof imageUrl === 'string' && isUsableImageReference(imageUrl)) {
    return imageUrl
  }

  if (isRecord(imageUrl)) {
    const nestedUrl = imageUrl.url
    if (typeof nestedUrl === 'string' && isUsableImageReference(nestedUrl)) {
      return nestedUrl
    }
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUsableImageReference(value: string) {
  return (
    value.startsWith('data:image/png;base64') ||
    value.startsWith('data:image/jpeg;base64') ||
    value.startsWith('data:image/') ||
    looksLikeBase64Image(value) ||
    isImageUrl(value)
  )
}

function collectImageCandidates(value: unknown): string[] {
  if (!value) {
    return []
  }

  if (typeof value === 'string') {
    if (isUsableImageReference(value)) {
      return [value]
    }

    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectImageCandidates(item))
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const directCandidates = collectKnownImageFields(record)

    return [
      ...directCandidates,
      ...Object.values(record).flatMap((item) => collectImageCandidates(item)),
    ]
  }

  return []
}

function collectKnownImageFields(record: Record<string, unknown>): string[] {
  const candidates: string[] = []

  ;['url', 'image_url', 'b64_json', 'data'].forEach((key) => {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value)
    } else {
      candidates.push(...collectImageCandidates(value))
    }
  })

  return candidates.filter(
    (candidate) => isUsableImageReference(candidate),
  )
}

function isImageUrl(value: string) {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'blob:' ||
      url.protocol === 'http:' ||
      url.protocol === 'https:' ||
      /\.(png|jpe?g|webp|gif)(?:$|\?)/i.test(url.pathname)
    )
  } catch {
    return false
  }
}

async function normalizeImageOutput(imageOutput: string): Promise<string> {
  if (imageOutput.startsWith('data:image/')) {
    return imageOutput
  }

  if (looksLikeBase64Image(imageOutput)) {
    return `data:image/png;base64,${imageOutput}`
  }

  const response = await fetch(imageOutput)
  if (!response.ok) {
    throw new Error('OpenRouter returned an image URL that could not be loaded.')
  }

  const blob = await response.blob()
  return blobToDataUrl(blob)
}

function looksLikeBase64Image(value: string) {
  return /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 200
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Unable to read generated image as a data URL.'))
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })
}

async function createMockAfterImage(
  beforeImageUrl: string,
  spec: ImprovedDesignSpec,
): Promise<string> {
  const source = await loadImage(beforeImageUrl)
  const size = fitImage(source.width, source.height, 900, 1400)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = Math.max(size.height, 1000)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  ctx.fillStyle = spec.colorPlan.background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const imageHeight = Math.round(canvas.height * 0.48)
  ctx.drawImage(source, 0, 0, canvas.width, imageHeight)
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.fillRect(0, imageHeight - 116, canvas.width, 116)

  ctx.fillStyle = spec.colorPlan.text
  ctx.font = '700 34px system-ui, sans-serif'
  wrapText(ctx, spec.hero.headline, 34, imageHeight - 72, canvas.width - 68, 40)

  ctx.fillStyle = spec.colorPlan.accent
  ctx.fillRect(34, imageHeight + 34, 88, 6)

  ctx.fillStyle = spec.colorPlan.text
  ctx.font = '700 28px system-ui, sans-serif'
  ctx.fillText(spec.title, 34, imageHeight + 86)

  ctx.font = '500 18px system-ui, sans-serif'
  ctx.fillStyle = '#475569'
  wrapText(ctx, spec.hero.subheadline, 34, imageHeight + 126, canvas.width - 68, 28)

  const cardTop = imageHeight + 215
  spec.sections.slice(0, 3).forEach((section, index) => {
    const top = cardTop + index * 170
    ctx.fillStyle = spec.colorPlan.callout
    roundRect(ctx, 34, top, canvas.width - 68, 128, 18)
    ctx.fill()
    ctx.fillStyle = spec.colorPlan.text
    ctx.font = '700 21px system-ui, sans-serif'
    ctx.fillText(section.heading, 58, top + 42)
    ctx.font = '400 16px system-ui, sans-serif'
    wrapText(ctx, section.goal, 58, top + 74, canvas.width - 116, 24)
  })

  ctx.fillStyle = spec.colorPlan.accent
  roundRect(ctx, 34, canvas.height - 96, canvas.width - 68, 58, 12)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 18px system-ui, sans-serif'
  ctx.fillText('AI improved detail page mock', 58, canvas.height - 59)

  return canvas.toDataURL('image/png')
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ')
  let line = ''

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      y += lineHeight
      line = word
      return
    }
    line = testLine
  })

  if (line) {
    ctx.fillText(line, x, y)
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}
