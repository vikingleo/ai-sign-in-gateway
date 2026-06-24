import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'

const PAGE_TABLE_RESERVED_HEIGHT = 112
const PAGE_TABLE_MIN_HEIGHT = 220
const PAGE_TABLE_FALLBACK_OFFSET = 378
const PAGE_TABLE_FALLBACK_MIN = 260
const PAGE_TABLE_EXTRA_BUFFER = 0

export function createBindPageTableContainerAction({
  setContainer,
}: {
  setContainer: (element: HTMLElement | null) => void
}) {
  return (element: Element | ComponentPublicInstance | null) => {
    setContainer(element instanceof HTMLElement ? element : null)
  }
}

export function useTableScrollHeights() {
  const viewportHeight = ref<number>(window.innerHeight)
  const pageTableContainer = ref<HTMLElement | null>(null)
  const pageTableContainerHeight = ref<number>(0)
  const pageTableChromeHeight = ref<number>(PAGE_TABLE_RESERVED_HEIGHT)
  let pageTableObserver: ResizeObserver | null = null
  let updateFrame = 0

  function measurePageTableChromeHeight(container: HTMLElement | null) {
    if (!container) {
      return PAGE_TABLE_RESERVED_HEIGHT
    }

    const tableWrapper = container.querySelector('.ant-table-wrapper')
    if (!(tableWrapper instanceof HTMLElement)) {
      return PAGE_TABLE_RESERVED_HEIGHT
    }

    const header = tableWrapper.querySelector('.ant-table-header')
    const title = tableWrapper.querySelector('.ant-table-title')
    const pagination = tableWrapper.querySelector('.ant-table-pagination')
    const stickyScroll = tableWrapper.querySelector('.ant-table-sticky-scroll')

    const headerHeight = header instanceof HTMLElement
      ? header.offsetHeight
      : (tableWrapper.querySelector('.ant-table-thead') as HTMLElement | null)?.offsetHeight ?? 0
    const titleHeight = title instanceof HTMLElement ? title.offsetHeight : 0
    const paginationHeight = pagination instanceof HTMLElement ? pagination.offsetHeight : 0
    const stickyScrollHeight = stickyScroll instanceof HTMLElement ? stickyScroll.offsetHeight : 0

    return Math.max(
      headerHeight + titleHeight + paginationHeight + stickyScrollHeight + PAGE_TABLE_EXTRA_BUFFER,
      PAGE_TABLE_RESERVED_HEIGHT,
    )
  }

  function update() {
    viewportHeight.value = window.innerHeight
    pageTableContainerHeight.value = pageTableContainer.value?.clientHeight ?? 0
    pageTableChromeHeight.value = measurePageTableChromeHeight(pageTableContainer.value)
  }

  function scheduleUpdate() {
    cancelAnimationFrame(updateFrame)
    updateFrame = window.requestAnimationFrame(update)
  }

  onMounted(() => {
    window.addEventListener('resize', scheduleUpdate)
    pageTableObserver = new ResizeObserver(() => {
      scheduleUpdate()
    })
    if (pageTableContainer.value) {
      pageTableObserver.observe(pageTableContainer.value)
    }
    scheduleUpdate()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', scheduleUpdate)
    pageTableObserver?.disconnect()
    pageTableObserver = null
    cancelAnimationFrame(updateFrame)
  })

  watch(pageTableContainer, (next, prev) => {
    if (prev) {
      pageTableObserver?.unobserve(prev)
    }
    if (next) {
      pageTableObserver?.observe(next)
      scheduleUpdate()
      return
    }
    pageTableContainerHeight.value = 0
    pageTableChromeHeight.value = PAGE_TABLE_RESERVED_HEIGHT
  })

  const pageTableY = computed(() => {
    if (pageTableContainerHeight.value > 0) {
      return Math.max(pageTableContainerHeight.value - pageTableChromeHeight.value, PAGE_TABLE_MIN_HEIGHT)
    }
    return Math.max(viewportHeight.value - PAGE_TABLE_FALLBACK_OFFSET, PAGE_TABLE_FALLBACK_MIN)
  })
  const drawerTableY = computed(() => Math.max(viewportHeight.value - 250, 220))
  const modalTableY = computed(() => Math.max(viewportHeight.value - 520, 180))

  return {
    pageTableY,
    pageTableContainer,
    drawerTableY,
    modalTableY,
  }
}
