import message from 'ant-design-vue/es/message'

export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

function show(type: ToastItem['type'], content: string, duration = 2.6): void {
  message[type]({
    content,
    duration,
  })
}

export function useToast() {
  return {
    items: [] as ToastItem[],
    success(content: string) {
      show('success', content)
    },
    error(content: string) {
      show('error', content, 3.2)
    },
    info(content: string) {
      show('info', content)
    },
  }
}
