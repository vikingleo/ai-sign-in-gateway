function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

export function toDatetimeLocalValue(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-') + `T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`
}

export function datetimeLocalToISOString(value: string) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function buildGatewayUsageTodayRange(now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return {
    start: toDatetimeLocalValue(start),
    end: toDatetimeLocalValue(now),
  }
}
