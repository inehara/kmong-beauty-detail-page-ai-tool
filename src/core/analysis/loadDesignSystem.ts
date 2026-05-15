import beautyToolDesignSystem from '../../data/beauty-design-systems/beauty_tool.json'
import cleansingDesignSystem from '../../data/beauty-design-systems/cleansing.json'
import hairBodyDesignSystem from '../../data/beauty-design-systems/hair_body.json'
import makeupDesignSystem from '../../data/beauty-design-systems/makeup.json'
import skincareDesignSystem from '../../data/beauty-design-systems/skincare.json'
import type { BeautyDesignSystem } from '../../types/design-system'
import type { BeautySubcategory } from '../../types/workflow'

const designSystems: Record<BeautySubcategory, BeautyDesignSystem> = {
  skincare: skincareDesignSystem as BeautyDesignSystem,
  makeup: makeupDesignSystem as BeautyDesignSystem,
  cleansing: cleansingDesignSystem as BeautyDesignSystem,
  hair_body: hairBodyDesignSystem as BeautyDesignSystem,
  beauty_tool: beautyToolDesignSystem as BeautyDesignSystem,
}

export function loadDesignSystem(category: BeautySubcategory): BeautyDesignSystem {
  return designSystems[category]
}
