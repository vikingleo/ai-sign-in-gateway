import type { ComponentPublicInstance } from 'vue'
import { createBindPageTableContainerAction, useTableScrollHeights } from './composables/useTableScrollHeights'

type TableScrollHeights = ReturnType<typeof useTableScrollHeights>
type BindPageTableContainer = (element: Element | ComponentPublicInstance | null) => void

type CreateBindPageTableContainerAction = (options: {
  setContainer: (element: HTMLElement | null) => void
}) => BindPageTableContainer

export function useGatewayPageTableLayout({
  useTableScrollHeightsImpl = useTableScrollHeights,
  createBindPageTableContainerActionImpl = createBindPageTableContainerAction,
}: {
  useTableScrollHeightsImpl?: () => TableScrollHeights
  createBindPageTableContainerActionImpl?: CreateBindPageTableContainerAction
} = {}) {
  const { pageTableY, pageTableContainer, drawerTableY } = useTableScrollHeightsImpl()
  const bindPageTableContainer = createBindPageTableContainerActionImpl({
    setContainer: (element) => {
      pageTableContainer.value = element
    },
  })

  return {
    pageTableY,
    drawerTableY,
    bindPageTableContainer,
  }
}
