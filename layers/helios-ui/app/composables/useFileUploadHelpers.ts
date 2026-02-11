export type AFileKind =
  | 'document'
  | 'archive'
  | 'spreadsheet'
  | 'video'
  | 'audio'
  | 'image'
  | 'other'

const includesAnyExtension = (fileName: string, extensions: string[]) => {
  const normalized = fileName.toLowerCase()
  return extensions.some(ext => normalized.endsWith(ext))
}

export const getFileKind = (file: File): AFileKind => {
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()

  if (
    type.includes('pdf')
    || type.includes('word')
    || includesAnyExtension(name, ['.pdf', '.doc', '.docx', '.txt', '.md'])
  ) {
    return 'document'
  }

  if (
    type.includes('zip')
    || type.includes('archive')
    || includesAnyExtension(name, ['.zip', '.rar', '.7z', '.tar', '.gz'])
  ) {
    return 'archive'
  }

  if (
    type.includes('excel')
    || type.includes('spreadsheet')
    || includesAnyExtension(name, ['.xls', '.xlsx', '.csv'])
  ) {
    return 'spreadsheet'
  }

  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type.startsWith('image/')) return 'image'

  return 'other'
}

export const getFileIconClass = (file: File) => {
  const kind = getFileKind(file)

  if (kind === 'document') return 'i-lucide-file-text'
  if (kind === 'archive') return 'i-lucide-file-archive'
  if (kind === 'spreadsheet') return 'i-lucide-file-spreadsheet'
  if (kind === 'video') return 'i-lucide-video'
  if (kind === 'audio') return 'i-lucide-headphones'
  if (kind === 'image') return 'i-lucide-image'

  return 'i-lucide-file'
}

export const isImageFile = (file: File) => getFileKind(file) === 'image'

export const getFileExtension = (name: string) => {
  const segment = String(name || '').trim().split('.').pop()
  if (!segment) return 'FILE'
  return segment.toUpperCase()
}

export const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = size
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1)
  return `${rounded} ${units[unitIndex]}`
}

export const getDisplayFilePath = (file: File) => {
  const relative = String(file.webkitRelativePath || '').trim()
  if (relative) return relative
  return String(file.name || '').trim()
}

export const downloadLocalFile = (file: File) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
