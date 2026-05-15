import type { DesignAnalysis } from '../../types/design-analysis'
import type { BeautyDesignSystem } from '../../types/design-system'
import type { ImprovedDesignSpec } from '../../types/improvement-spec'

export function createImprovementSpec(
  analysis: DesignAnalysis,
  designSystem: BeautyDesignSystem,
): ImprovedDesignSpec {
  return {
    title: `${designSystem.displayName} detail page refresh`,
    categoryDesignSystem: designSystem.category,
    sourceAnalysisSummary: analysis.summary,
    hero: {
      headline: buildHeroHeadline(designSystem),
      subheadline: `${designSystem.positioning} The first screen should make the core benefit, product identity, and proof cues instantly scannable.`,
      visualTreatment: designSystem.imageDirection.join(', '),
    },
    sections: designSystem.contentBlocks.map((block, index) => {
      const sourceSection = analysis.sections[index % analysis.sections.length]

      return {
        heading: block,
        goal: sourceSection?.recommendedFix || designSystem.layoutRules[index % designSystem.layoutRules.length],
        designInstruction: `${designSystem.layoutRules[index % designSystem.layoutRules.length]} Use ${designSystem.typography.body} with ${designSystem.colors.primary} accents.`,
      }
    }),
    colorPlan: {
      background: designSystem.colors.background,
      text: designSystem.colors.text,
      accent: designSystem.colors.primary,
      callout: designSystem.colors.surface,
    },
    typographyPlan: `${designSystem.typography.headline} for headlines; ${designSystem.typography.body} for body; ${designSystem.typography.label} for scan labels.`,
    imagePrompt: [
      `Improve this uploaded ${designSystem.displayName.toLowerCase()} detail page.`,
      designSystem.positioning,
      `Visual direction: ${designSystem.imageDirection.join('; ')}.`,
      `Conversion cues: ${designSystem.conversionCues.join('; ')}.`,
      'Keep the product recognizable while improving layout, readability, and category-specific trust.',
    ].join(' '),
    qualityChecklist: [
      'Primary benefit is visible above the fold.',
      'Before/after output preserves product identity.',
      'Category trust cues are grouped and readable.',
      'Mobile scanning is improved with clear section rhythm.',
    ],
    generatedAt: new Date().toISOString(),
    mock: analysis.mock,
  }
}

function buildHeroHeadline(designSystem: BeautyDesignSystem) {
  const headlines: Record<BeautyDesignSystem['category'], string> = {
    skincare: 'Visible skin confidence, explained clearly',
    makeup: 'Color, finish, and wear you can judge fast',
    cleansing: 'Clean comfort without the guesswork',
    hair_body: 'Daily care made sensory and specific',
    beauty_tool: 'Precise results with clear tool proof',
  }

  return headlines[designSystem.category]
}
