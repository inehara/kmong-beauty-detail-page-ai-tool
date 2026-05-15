import type { BeautySubcategory } from './workflow'

export type DesignSystemTokenSet = {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
}

export type BeautyDesignSystem = {
  category: BeautySubcategory
  displayName: string
  positioning: string
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
