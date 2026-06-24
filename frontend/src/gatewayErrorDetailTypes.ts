export type GatewayErrorDetailLine = {
  label: string
  value: string
  tone?: 'error' | 'success' | 'info'
}

export type GatewayErrorDetailField = {
  label: string
  value: string
}

export type GatewayErrorDetail = {
  title: string
  sourceLabel: string
  statusLabel: string
  success: boolean
  lines: GatewayErrorDetailLine[]
  fields: GatewayErrorDetailField[]
  fullText: string
}
