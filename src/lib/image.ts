const MAX_EDGE = 1568
const JPEG_QUALITY = 0.85
const MAX_BYTES = 4 * 1024 * 1024

export interface ProcessedImage {
  base64: string
  mediaType: string
  dataUrl: string
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image file.'))
    }
    img.src = url
  })
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL('image/jpeg', quality)
}

export async function processChartImage(file: Blob): Promise<ProcessedImage> {
  const img = await loadImage(file)

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported in this browser.')
  ctx.drawImage(img, 0, 0, width, height)

  let quality = JPEG_QUALITY
  let dataUrl = canvasToDataUrl(canvas, quality)

  while (dataUrl.length > MAX_BYTES && quality > 0.4) {
    quality -= 0.1
    dataUrl = canvasToDataUrl(canvas, quality)
  }

  if (dataUrl.length > MAX_BYTES) {
    throw new Error('Image is too large even after compression. Try a smaller screenshot.')
  }

  const base64 = dataUrl.split(',')[1]
  return { base64, mediaType: 'image/jpeg', dataUrl }
}

export function thumbnailFromDataUrl(dataUrl: string, maxWidth = 200, quality = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported in this browser.'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Could not build thumbnail.'))
    img.src = dataUrl
  })
}
