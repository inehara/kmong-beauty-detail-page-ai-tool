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
  source: 'mock' | 'openai'
  status: string
  fallbackReason?: string
  issueReport?: IssueReport
}

type OpenAiResponsesPayload = {
  output?: unknown[]
  data?: unknown[]
}

const OPENAI_IMAGE_GENERATION_TIMEOUT_MS = 180_000
const OPENAI_GENERATION_IMAGE_MAX_WIDTH = 1024
const OPENAI_GENERATION_IMAGE_MAX_HEIGHT = 2048
const OPENAI_GENERATION_IMAGE_QUALITY = 0.85

export async function generateImage({
  beforeImageUrl,
  originalAnalysis,
  designSystem,
  spec,
}: GenerateImageInput): Promise<GenerateImageResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  const model = import.meta.env.VITE_OPENAI_IMAGE_MODEL || 'gpt-image-2'

  debugOpenAiImageGeneration('active image provider', 'openai')
  debugOpenAiImageGeneration('active image model', model)

  if (!isValidOpenAiApiKey(apiKey)) {
    const error = new Error(
      'OpenAI API key is missing or invalid. Falling back to mock after image.',
    )

    debugOpenAiImageGeneration('fallback reason', error.message)

    return {
      imageUrl: await createMockAfterImage(beforeImageUrl, spec),
      source: 'mock',
      status: 'Fell back to mock after image.',
      fallbackReason: error.message,
      issueReport: createOpenAiIssueReport(error, model, designSystem, originalAnalysis),
    }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    OPENAI_IMAGE_GENERATION_TIMEOUT_MS,
  )

  try {
    // TODO: Move OpenAI image generation calls to backend API routes before real deployment.
    const resizedReferenceImage = await resizeImageForOpenAiGeneration(beforeImageUrl)

    debugOpenAiImageGeneration('request started', {
      model,
      timeoutMs: OPENAI_IMAGE_GENERATION_TIMEOUT_MS,
    })

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: buildImagePrompt(originalAnalysis, designSystem, spec),
        images: [
          {
            image_url: resizedReferenceImage.dataUrl,
          },
        ],
        n: 1,
      }),
    })

    debugOpenAiImageGeneration('request completed', {
      ok: response.ok,
      status: response.status,
    })

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'OpenAI API key is missing or invalid. Falling back to mock after image.',
      )
    }

    if (!response.ok) {
      const responseBody = await response.text()
      throw new Error(
        `OpenAI image generation failed with HTTP ${response.status}. Response body: ${responseBody}`,
      )
    }

    debugOpenAiImageGeneration('response received')
    debugOpenAiImageGeneration('response parsing started')
    const payload = (await response.json()) as OpenAiResponsesPayload
    const imageOutput = extractImageOutput(payload)

    if (!imageOutput) {
      throw new Error('OpenAI image generation did not return a usable image output.')
    }

    const imageUrl = await normalizeImageOutput(imageOutput)
    debugOpenAiImageGeneration('response parsing succeeded')

    return {
      imageUrl,
      source: 'openai',
      status: 'After image generated with OpenAI.',
    }
  } catch (error) {
    const normalizedError = normalizeOpenAiImageGenerationError(error)
    const fallbackReason = getFallbackReason(normalizedError)
    debugOpenAiImageGeneration('response parsing failed', normalizedError.message)
    debugOpenAiImageGeneration('fallback reason', fallbackReason)

    return {
      imageUrl: await createMockAfterImage(beforeImageUrl, spec),
      source: 'mock',
      status: getAfterImageStatus(normalizedError),
      fallbackReason,
      issueReport: createOpenAiIssueReport(
        normalizedError,
        model,
        designSystem,
        originalAnalysis,
      ),
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function isValidOpenAiApiKey(apiKey: unknown): apiKey is string {
  return typeof apiKey === 'string' && apiKey.trim().length > 0 && isAscii(apiKey)
}

function createOpenAiIssueReport(
  error: Error,
  model: string,
  designSystem: BeautyDesignSystem,
  originalAnalysis: DesignAnalysis,
) {
  return createIssueReport({
    error,
    workflowStep: 'generating_after',
    context: {
      provider: 'openai',
      model,
      category: designSystem.category,
      analysisSource: originalAnalysis.analysisSource,
    },
  })
}

function debugOpenAiImageGeneration(event: string, details?: unknown) {
  if (details === undefined) {
    console.debug(`[OpenAI image generation] ${event}`)
    return
  }

  console.debug(`[OpenAI image generation] ${event}`, details)
}

function normalizeOpenAiImageGenerationError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new Error('OpenAI image generation timed out after 180 seconds.')
  }

  return error instanceof Error
    ? error
    : new Error('OpenAI image generation failed.')
}

function getAfterImageStatus(error: Error) {
  if (error.message === 'OpenAI image generation timed out after 180 seconds.') {
    return 'OpenAI image generation timed out after 180 seconds.'
  }

  if (
    error.message ===
      'OpenAI image generation did not return a usable image output.' ||
    error.message.includes('could not be loaded')
  ) {
    return 'OpenAI image response parsing failed.'
  }

  return 'Fell back to mock after image.'
}

function getFallbackReason(error: Error) {
  return error.message
}

function isAscii(value: string) {
  return /^[\x00-\x7F]*$/.test(value)
}

async function resizeImageForOpenAiGeneration(beforeImageUrl: string) {
  const source = await loadImage(beforeImageUrl)
  const size = fitImage(
    source.width,
    source.height,
    OPENAI_GENERATION_IMAGE_MAX_WIDTH,
    OPENAI_GENERATION_IMAGE_MAX_HEIGHT,
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

  const dataUrl = canvas.toDataURL('image/jpeg', OPENAI_GENERATION_IMAGE_QUALITY)

  debugOpenAiImageGeneration('original image dimensions', {
    width: source.width,
    height: source.height,
  })
  debugOpenAiImageGeneration('resized image dimensions', {
    width: size.width,
    height: size.height,
  })
  debugOpenAiImageGeneration('original data URL size', beforeImageUrl.length)
  debugOpenAiImageGeneration('resized data URL size', dataUrl.length)

  return {
    dataUrl,
    width: size.width,
    height: size.height,
  }
}

function buildImagePrompt(
  originalAnalysis: DesignAnalysis,
  designSystem: BeautyDesignSystem,
  spec: ImprovedDesignSpec,
) {
  return [
    'Create one improved beauty ecommerce detail-page image based on the uploaded reference image and improved_design_spec.',
    'Preserve the original product or service information as much as possible.',
    'Improve layout, visual hierarchy, readability, and conversion structure.',
    'Do not hallucinate unsupported claims.',
    'Do not add medical, legal, or unsupported efficacy claims.',
    'Keep text minimal and readable.',
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
    'selected category design system:',
    JSON.stringify(designSystem, null, 2),
    '',
    'improved_design_spec.json:',
    JSON.stringify(spec, null, 2),
  ].join('\n')
}

function extractImageOutput(payload: unknown): string | null {
  const candidates = collectImageCandidates(payload)
  return candidates[0] || null
}

function collectImageCandidates(value: unknown): string[] {
  if (!value) {
    return []
  }

  if (typeof value === 'string') {
    if (
      value.startsWith('data:image/') ||
      looksLikeBase64Image(value) ||
      isImageUrl(value)
    ) {
      return [value]
    }

    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectImageCandidates(item))
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return [
      ...collectKnownImageFields(record),
      ...Object.values(record).flatMap((item) => collectImageCandidates(item)),
    ]
  }

  return []
}

function collectKnownImageFields(record: Record<string, unknown>) {
  const candidates: string[] = []

  ;['url', 'image_url', 'b64_json', 'result', 'data'].forEach((key) => {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value)
    } else {
      candidates.push(...collectImageCandidates(value))
    }
  })

  return candidates.filter(
    (candidate) =>
      candidate.startsWith('data:image/') ||
      looksLikeBase64Image(candidate) ||
      isImageUrl(candidate),
  )
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
    throw new Error('OpenAI returned an image URL that could not be loaded.')
  }

  const blob = await response.blob()
  return blobToDataUrl(blob)
}

function looksLikeBase64Image(value: string) {
  return /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 200
}

function isImageUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:'
  } catch {
    return false
  }
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
