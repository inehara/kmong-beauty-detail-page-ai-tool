import type { DesignAnalysis } from '../../types/design-analysis'
import type { BeautyDesignSystem } from '../../types/design-system'
import type { ImprovedDesignSpec } from '../../types/improvement-spec'
import type { ReferenceStyleInfluence } from '../../types/workflow'

export const DEFAULT_GENERATION_MODE =
  'content_extraction_direct_reference_rebuild'

export function createImprovementSpec(
  analysis: DesignAnalysis,
  designSystem: BeautyDesignSystem,
  referenceStyleInfluence: ReferenceStyleInfluence = 'high',
): ImprovedDesignSpec {
  return {
    title: `${designSystem.displayName} detail page refresh`,
    categoryDesignSystem: designSystem.category,
    generationMode: DEFAULT_GENERATION_MODE,
    referenceStyleInfluence,
    sourceAnalysisSummary: analysis.summary,
    contentExtractionRules: [
      'Extract product name.',
      'Extract brand context.',
      'Extract key product visuals.',
      'Extract product benefits.',
      'Extract texture, color, usage, and proof information.',
      'Extract sales and CTA information if visible.',
    ],
    directReferenceStyleRules: [
      'Use passed reference images as primary visual style guide.',
      'Copy reference-level layout rhythm, not exact content.',
      'Apply reference card styles.',
      'Apply reference typography hierarchy.',
      'Apply reference CTA/button style.',
      'Apply reference trust/proof block style.',
      'Apply reference spacing and visual polish.',
    ],
    directReferenceUsageRules: [
      'Use contact sheet as visual source of truth.',
      'Original image is content source only.',
      'Reference contact sheet controls layout, card style, spacing, typography, CTA styling, and visual polish.',
    ],
    referenceContactSheetRules: [
      'Use the cropped hero, middle, and lower reference tiles as the primary style evidence.',
      'Read layout rhythm, section grouping, card treatment, CTA styling, and typography hierarchy from the contact sheet.',
      'Do not copy reference product content; transfer only the design language to the original product content.',
    ],
    originalLayoutDiscardRules: [
      'Do not preserve original composition.',
      'Do not preserve original spacing rhythm.',
      'Do not preserve original section styling.',
      'Do not preserve original typography treatment.',
      'Do not preserve original visual block arrangement.',
      'Do not treat original image as a template.',
    ],
    referenceRebuildRules: [
      'Rebuild a new detail page layout based on selected reference design style.',
      'Create stronger hero section.',
      'Create clearer product benefit blocks.',
      'Create card-based product information sections.',
      'Create better commerce hierarchy.',
      'Create stronger CTA area.',
      'Create premium mobile detail-page finish.',
    ],
    contentPreservationRules: [
      'Preserve factual information.',
      'Preserve product/service meaning.',
      'Preserve key selling points.',
      'Preserve core product visuals and important supporting visuals.',
      'Preserve original content completeness.',
      'Preserve content roles even if layout changes.',
      'Do not invent unsupported claims, ingredients, reviews, prices, effects, or new content.',
      'Do not remove important original information or distort the meaning of the original content.',
    ],
    visualTransformationRules: [
      'Strongly transform layout.',
      'Strongly transform typography.',
      'Strongly transform spacing.',
      'Strongly transform card blocks.',
      'Strongly transform CTA styling.',
      'Strongly transform visual hierarchy.',
      'Strongly transform commerce polish.',
      buildInfluenceRule(referenceStyleInfluence),
    ],
    outputCanvasRules: [
      'Vertical mobile detail page.',
      'No black side bars.',
      'No letterboxing.',
      'No screenshot/browser mockup.',
      'Use full canvas.',
      'Maintain clean background.',
      'Keep readable visual hierarchy.',
      'Avoid tiny unreadable text where possible.',
      'Create a polished full-page design.',
    ],
    hero: {
      headline: 'Preserve original hero content and rebuild the composition in the Kmong reference language',
      subheadline: `${designSystem.positioning} Keep the original hero information and product meaning, but allow stronger layout and composition redesign with the selected Kmong category system.`,
      visualTreatment: designSystem.imageDirection.join(', '),
    },
    sections: buildStructureTransformingSectionSpecs(analysis, designSystem),
    colorPlan: {
      background: designSystem.colors.background,
      text: designSystem.colors.text,
      accent: designSystem.colors.primary,
      callout: designSystem.colors.surface,
    },
    typographyPlan: `${designSystem.typography.headline} for headlines; ${designSystem.typography.body} for body; ${designSystem.typography.label} for scan labels.`,
    imagePrompt: [
      `Improve this uploaded ${designSystem.displayName.toLowerCase()} detail page.`,
      `Generation mode: ${DEFAULT_GENERATION_MODE}.`,
      'Extract content, product visuals, brand context, and key selling points from the original image.',
      'Do not treat the original image as the visual layout reference.',
      'Use passed Kmong reference images as the primary visual style guide and rebuild the detail page from scratch using the selected Kmong reference design system.',
      `Reference style influence: ${referenceStyleInfluence}.`,
      designSystem.positioning,
      designSystem.promptGuidance,
      `Visual direction: ${designSystem.imageDirection.join('; ')}.`,
      `Conversion cues: ${designSystem.conversionCues.join('; ')}.`,
      `Reference style rules: ${[
        ...(designSystem.coreDesignPrinciples ?? []),
        ...(designSystem.heroSectionRules ?? []),
        ...(designSystem.typographyRules ?? []),
        ...(designSystem.colorRules ?? []),
        ...(designSystem.visualTreatmentRules ?? []),
      ].join('; ')}.`,
      'Keep only the content and key product/brand assets recognizable while strongly transforming layout structure and visual presentation toward the selected Kmong reference style.',
    ]
      .filter(Boolean)
      .join(' '),
    qualityChecklist: [
      'Original content meaning, factual information, key selling points, and core product visuals are preserved.',
      'Important original information is not removed, invented, or distorted.',
      'Layout structure and section composition are allowed to change for stronger Kmong-style commerce clarity.',
      'Typography hierarchy, spacing rhythm, CTA styling, trust badges, cards, visual grouping, and premium polish strongly reflect the selected Kmong reference design system.',
    ],
    generatedAt: new Date().toISOString(),
    mock: analysis.mock,
  }
}

function buildInfluenceRule(referenceStyleInfluence: ReferenceStyleInfluence) {
  const rules: Record<ReferenceStyleInfluence, string> = {
    low: 'Preserve more of the original layout and styling while applying subtle Kmong reference polish.',
    medium:
      'Preserve original content strongly, but allow moderate structural redesign toward the selected Kmong reference style.',
    high: 'Original layout fidelity should be low; content preservation should be high; reference layout and style influence should be very high; the result should look significantly redesigned.',
  }

  return rules[referenceStyleInfluence]
}

function buildStructureTransformingSectionSpecs(
  analysis: DesignAnalysis,
  designSystem: BeautyDesignSystem,
): ImprovedDesignSpec['sections'] {
  const sourceSections =
    analysis.sections.length > 0
      ? analysis.sections
      : [
          {
            name: 'Original detail page section',
            observedIssue: analysis.summary,
            recommendedFix: analysis.recommendedDirection,
          },
        ]

  return sourceSections.map((sourceSection, index) => {
    const layoutRule = designSystem.layoutRules[index % designSystem.layoutRules.length]
    const sectionPattern =
      designSystem.sectionPatterns?.[index % (designSystem.sectionPatterns.length || 1)]
    const visualRule =
      designSystem.visualTreatmentRules?.[
        index % (designSystem.visualTreatmentRules.length || 1)
      ]
    const conversionRule =
      designSystem.conversionRules?.[index % (designSystem.conversionRules.length || 1)]

    return {
      heading: sourceSection.name,
      goal:
        sourceSection.recommendedFix ||
        'Preserve this original content role while improving structure, hierarchy, and visual clarity.',
      designInstruction: [
        'Preserve this original content role, but allow its layout grouping, composition, and relative presentation to change for stronger commerce clarity.',
        layoutRule,
        sectionPattern,
        visualRule,
        conversionRule,
        `Apply ${designSystem.typography.body} with ${designSystem.colors.primary} accents.`,
      ]
        .filter(Boolean)
        .join(' '),
      sourceRole: 'original_content_source',
    }
  })
}
