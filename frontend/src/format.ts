export function formatBalance(balance: number | null | undefined, unit?: string | null): string {
  if (balance === null || balance === undefined || Number.isNaN(balance)) {
    return ''
  }

  const value = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 4,
  }).format(balance)

  const normalizedUnit = normalizeBalanceUnit(unit)
  if (['$', '¥', '€', '£'].includes(normalizedUnit)) {
    return `${normalizedUnit}${value}`
  }
  return `${value} ${normalizedUnit}`
}

export function normalizeBalanceUnit(unit?: string | null, fallback = '$'): string {
  const raw = (unit ?? fallback).trim()
  if (!raw) {
    return fallback
  }
  const compact = raw.replace(/[\s_.-]+/g, '').toLowerCase()
  if (['$', '＄', 'usd', 'us$', '$usd', 'usd$', 'dollar', 'dollars', 'usdollar', 'usdollars', '美元', '美金'].includes(compact)) {
    return '$'
  }
  if (['cny', 'rmb', 'yuan', 'renminbi', '人民币', '元'].includes(compact)) {
    return '¥'
  }
  if (['eur', 'euro', 'euros', '欧元'].includes(compact)) {
    return '€'
  }
  if (['gbp', 'pound', 'pounds', '英镑'].includes(compact)) {
    return '£'
  }
  return raw
}

export function balanceTone(balance: number | null | undefined): 'positive' | 'negative' | 'zero' | 'empty' {
  if (balance === null || balance === undefined || Number.isNaN(balance)) {
    return 'empty'
  }
  if (balance < 0) {
    return 'negative'
  }
  if (balance > 0) {
    return 'positive'
  }
  return 'zero'
}

export function parseGroupNames(value: string | string[] | null | undefined): string[] {
  const rawItems = Array.isArray(value) ? value : [value ?? '']
  const groups: string[] = []
  const seen = new Set<string>()

  rawItems.forEach((item) => {
    String(item ?? '')
      .split(/[,，;/|、\n\r\t]+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .forEach((segment) => {
        const marker = segment.toLowerCase()
        if (seen.has(marker)) {
          return
        }
        seen.add(marker)
        groups.push(segment)
      })
  })

  return groups
}

export function normalizeGroupNames(value: string | string[] | null | undefined): string {
  return parseGroupNames(value).join(',')
}

export function formatGroupNames(value: string | string[] | null | undefined, separator = ' / '): string {
  return parseGroupNames(value).join(separator)
}
