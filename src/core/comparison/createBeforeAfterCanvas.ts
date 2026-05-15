import { fitImage, loadImage } from '../../utils/imageCanvas'

export async function createBeforeAfterCanvas(
  beforeImageUrl: string,
  afterImageUrl: string,
): Promise<string> {
  const before = await loadImage(beforeImageUrl)
  const after = await loadImage(afterImageUrl)
  const panelWidth = 520
  const panelHeight = 760
  const labelHeight = 64
  const gap = 24

  const canvas = document.createElement('canvas')
  canvas.width = panelWidth * 2 + gap + 64
  canvas.height = panelHeight + labelHeight + 64

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  ctx.fillStyle = '#f5f7f8'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawPanel(ctx, before, 32, 32, panelWidth, panelHeight, 'Before')
  drawPanel(ctx, after, 32 + panelWidth + gap, 32, panelWidth, panelHeight, 'After')

  return canvas.toDataURL('image/png')
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
) {
  const labelHeight = 64
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, width, height + labelHeight)
  ctx.strokeStyle = '#d7dde3'
  ctx.strokeRect(x, y, width, height + labelHeight)

  const fit = fitImage(image.width, image.height, width, height)
  const imageX = x + Math.round((width - fit.width) / 2)
  const imageY = y + Math.round((height - fit.height) / 2)
  ctx.drawImage(image, imageX, imageY, fit.width, fit.height)

  ctx.fillStyle = '#111827'
  ctx.font = '700 28px system-ui, sans-serif'
  ctx.fillText(label, x + 24, y + height + 42)
}
