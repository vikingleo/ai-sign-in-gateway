import { computed, type Ref } from 'vue'
import { balanceTone } from '../format'
import type { Site } from '../types'

type UseSitesTableStateOptions = {
  sites: Ref<Site[]>
  selectedId: Ref<number | null>
  clearTestFeedback: () => void
}

export function useSitesTableState(options: UseSitesTableStateOptions) {
  const selectedSite = computed(() =>
    options.selectedId.value !== null
      ? options.sites.value.find((item) => item.id === options.selectedId.value) ?? null
      : null,
  )

  function rowKey(record: Site) {
    return record.id
  }

  function balanceClass(balance: number | null | undefined) {
    const tone = balanceTone(balance)
    return tone === 'empty' ? '' : `balance-value balance-value--${tone}`
  }

  function selectSite(site: Site) {
    options.selectedId.value = site.id
    options.clearTestFeedback()
  }

  function siteRowClassName(record: Site) {
    return record.id === options.selectedId.value ? 'management-row management-row--active' : 'management-row'
  }

  function siteCustomRow(record: Site) {
    return {
      onClick: () => selectSite(record),
    }
  }

  return {
    selectedSite,
    rowKey,
    balanceClass,
    selectSite,
    siteRowClassName,
    siteCustomRow,
  }
}
