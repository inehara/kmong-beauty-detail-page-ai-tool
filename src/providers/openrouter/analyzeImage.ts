import { createIssueReport } from '../../core/issue/createIssueReport'
import type { DesignAnalysis } from '../../types/design-analysis'
import type { IssueReport } from '../../types/issue-report'
import type { BeautySubcategory } from '../../types/workflow'

type AnalyzeImageInput = {
  imageDataUrl: string
  fileName: string
  category: BeautySubcategory
}

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

const categoryTone: Record<BeautySubcategory, string> = {
  skincare: 'calm clinical hydration',
  makeup: 'editorial color payoff',
  cleansing: 'fresh residue-free clarity',
  hair_body: 'warm sensory daily care',
  beauty_tool: 'precise ergonomic utility',
}

export async function analyzeImage({
  imageDataUrl,
  fileName,
  category,
}: AnalyzeImageInput): Promise<DesignAnalysis> {
  const provider = import.meta.env.VITE_ANALYSIS_PROVIDER || 'openrouter'
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  const model = import.meta.env.VITE_OPENROUTER_ANALYSIS_MODEL

  if (provider !== 'openrouter' || !apiKey || !model) {
    return createMockAnalysis(fileName, category)
  }

  try {
    // TODO: Move OpenRouter calls to backend API routes before real deployment.
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': getOpenRouterReferer(),
        'X-Title': 'Kmong Beauty Detail Page AI Tool',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: buildAnalysisPrompt(fileName, category),
              },
              {
                type: 'image_url',
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter analysis failed with HTTP ${response.status}.`)
    }

    const payload = (await response.json()) as OpenRouterChatResponse
    const content = extractContent(payload)
    const parsed = parseAnalysisJson(content)

    return normalizeOpenRouterAnalysis(parsed, fileName, category)
  } catch (error) {
    const issueReport = createIssueReport({
      error,
      workflowStep: 'analyzing_original',
      context: {
        provider: 'openrouter',
        model,
        fileName,
        category,
      },
    })

    return createMockAnalysis(fileName, category, issueReport)
  }
}

function getOpenRouterReferer() {
  const fallback = 'http://localhost:5173'
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : fallback

  return isAscii(origin) ? origin : fallback
}

function isAscii(value: string) {
  return [...value].every((character) => character.charCodeAt(0) <= 127)
}

function buildAnalysisPrompt(fileName: string, category: BeautySubcategory) {
  return [
    'Analyze the uploaded beauty ecommerce detail page image.',
    'Return strict JSON only. Do not wrap it in Markdown.',
    'The JSON must match this exact object shape:',
    '{',
    '  "fileName": string,',
    '  "category": "skincare" | "makeup" | "cleansing" | "hair_body" | "beauty_tool",',
    '  "detectedCategory": "skincare" | "makeup" | "cleansing" | "hair_body" | "beauty_tool",',
    '  "summary": string,',
    '  "targetCustomer": string,',
    '  "currentStrengths": string[],',
    '  "improvementOpportunities": string[],',
    '  "layout": string,',
    '  "typography": string,',
    '  "colorPalette": string,',
    '  "visualHierarchy": string,',
    '  "conversionIssues": string[],',
    '  "recommendedDirection": string',
    '}',
    `Use fileName: ${fileName}.`,
    `Use category: ${category} as the user-selected category.`,
    'Set detectedCategory to the category that best matches the visible uploaded image, even if it differs from the user-selected category.',
    'Focus on what is visible in the image and on practical conversion improvements.',
  ].join('\n')
}

function extractContent(payload: OpenRouterChatResponse) {
  const content = payload.choices?.[0]?.message?.content

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text)
      .filter((text): text is string => Boolean(text))
      .join('\n')
  }

  throw new Error('OpenRouter response did not include message content.')
}

function parseAnalysisJson(content: string) {
  const trimmed = content.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(withoutFence) as Partial<DesignAnalysis>
  } catch {
    throw new Error('OpenRouter returned analysis that could not be parsed as JSON.')
  }
}

function normalizeOpenRouterAnalysis(
  parsed: Partial<DesignAnalysis>,
  fileName: string,
  category: BeautySubcategory,
): DesignAnalysis {
  return {
    fileName: parsed.fileName || fileName,
    category,
    detectedCategory: normalizeBeautyCategory(parsed.detectedCategory) || category,
    summary: parsed.summary || 'Uploaded detail page analysis completed.',
    targetCustomer:
      parsed.targetCustomer || 'Beauty shoppers comparing trust signals.',
    currentStrengths: normalizeStringArray(parsed.currentStrengths),
    improvementOpportunities: normalizeStringArray(
      parsed.improvementOpportunities,
    ),
    layout:
      parsed.layout ||
      'Layout analysis was not provided by the model; use the category system to rebuild hierarchy.',
    typography:
      parsed.typography ||
      'Typography analysis was not provided by the model; improve scanability and contrast.',
    colorPalette:
      parsed.colorPalette ||
      'Color palette analysis was not provided by the model; align to selected category tokens.',
    visualHierarchy:
      parsed.visualHierarchy ||
      'Visual hierarchy analysis was not provided by the model; emphasize benefit, proof, and action.',
    conversionIssues: normalizeStringArray(parsed.conversionIssues),
    recommendedDirection:
      parsed.recommendedDirection ||
      'Use the selected category design system to clarify benefits, proof, and usage flow.',
    sections: [
      {
        name: 'Layout',
        observedIssue: parsed.layout || 'Layout needs clearer section rhythm.',
        recommendedFix:
          parsed.recommendedDirection ||
          'Rebuild the page around benefit, proof, and usage sections.',
      },
      {
        name: 'Conversion',
        observedIssue:
          normalizeStringArray(parsed.conversionIssues).join(' ') ||
          'Conversion issues need clearer prioritization.',
        recommendedFix:
          'Group trust cues, benefit claims, and next actions close to the relevant visuals.',
      },
    ],
    visualTone: categoryTone[category],
    confidenceScore: 0.82,
    analysisSource: 'openrouter',
    generatedAt: new Date().toISOString(),
    mock: false,
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string' && value.trim()) {
    return [value]
  }

  return []
}

function normalizeBeautyCategory(value: unknown): BeautySubcategory | undefined {
  if (
    value === 'skincare' ||
    value === 'makeup' ||
    value === 'cleansing' ||
    value === 'hair_body' ||
    value === 'beauty_tool'
  ) {
    return value
  }

  return undefined
}

function createMockAnalysis(
  fileName: string,
  category: BeautySubcategory,
  issueReport?: IssueReport,
): DesignAnalysis {
  return {
    fileName,
    category,
    detectedCategory: category,
    summary:
      'The original page communicates the product, but the hierarchy, proof points, and conversion cues need a clearer beauty-category structure.',
    targetCustomer:
      'Mobile-first shoppers who want quick reassurance on benefits, texture, usage, and credibility before purchasing.',
    currentStrengths: [
      'Product visuals are present and usable for a before state.',
      'The page already has enough source material to reorganize into benefit-led sections.',
      'Category fit can be improved with stronger proof and usage blocks.',
    ],
    improvementOpportunities: [
      'Move the primary benefit and product identity into the first viewport.',
      'Add category-specific trust cues and scannable callouts.',
      'Improve section rhythm with consistent spacing, labels, and proof blocks.',
    ],
    layout:
      'Mock analysis: the page should be reorganized into hero, proof, usage, and reassurance sections.',
    typography:
      'Mock analysis: stronger headline contrast and consistent body sizing would improve mobile scanning.',
    colorPalette:
      'Mock analysis: align background, callouts, and accent colors with the selected beauty category.',
    visualHierarchy:
      'Mock analysis: the primary product benefit should dominate the first viewport.',
    conversionIssues: [
      'Primary benefit is not immediately dominant.',
      'Trust cues and proof points are scattered.',
      'Usage steps need a clearer sequence.',
    ],
    recommendedDirection:
      'Use the selected category design system to create a benefit-led, proof-supported detail page.',
    sections: [
      {
        name: 'Hero',
        observedIssue: 'Primary value proposition is not immediately dominant.',
        recommendedFix: 'Create a bold benefit headline with a clear product crop.',
      },
      {
        name: 'Proof',
        observedIssue: 'Evidence and differentiators are scattered.',
        recommendedFix: 'Group claims, ingredients, specs, or results into one proof band.',
      },
      {
        name: 'Usage',
        observedIssue: 'The customer may need clearer next-step guidance.',
        recommendedFix: 'Add concise usage steps and expected result timing.',
      },
    ],
    visualTone: categoryTone[category],
    confidenceScore: 0.86,
    analysisSource: 'mock',
    issueReport,
    generatedAt: new Date().toISOString(),
    mock: true,
  }
}
