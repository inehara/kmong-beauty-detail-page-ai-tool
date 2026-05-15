export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load image into canvas.'))
    image.src = src
  })
}

export function fitImage(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1)

  return {
    width: Math.round(imageWidth * scale),
    height: Math.round(imageHeight * scale),
  }
}
