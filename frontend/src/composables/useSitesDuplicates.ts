import Modal from 'ant-design-vue/es/modal'
import { computed, ref, type Ref } from 'vue'
import {
  getDuplicateSites,
  mergeDuplicateSites,
} from '../api'
import {
  duplicateGroupRowKey as readDuplicateGroupRowKey,
  duplicateSuggestedSiteName as readDuplicateSuggestedSiteName,
  filterDuplicateGroups as filterDuplicateGroupRows,
} from '../sitesListModel'
import type { useToast } from '../toast'
import type { DuplicateSiteGroup } from '../types'

type Toast = ReturnType<typeof useToast>

type UseSitesDuplicatesOptions = {
  selectedId: Ref<number | null>
  toast: Toast
  loadData: (preferredId?: number | null, options?: { preserveEditor?: boolean }) => Promise<void>
}

export function useSitesDuplicates(options: UseSitesDuplicatesOptions) {
  const duplicateCheckOpen = ref(false)
  const duplicateCheckLoading = ref(false)
  const duplicateMergeLoading = ref(false)
  const duplicateChecked = ref(false)
  const duplicateGroups = ref<DuplicateSiteGroup[]>([])
  const duplicateSearch = ref('')
  const filteredDuplicateGroups = computed(() => filterDuplicateGroupRows(duplicateGroups.value, duplicateSearch.value))

  function duplicateGroupRowKey(record: unknown) {
    return readDuplicateGroupRowKey(record as DuplicateSiteGroup)
  }

  function duplicateSuggestedSiteName(record: unknown) {
    return readDuplicateSuggestedSiteName(record as DuplicateSiteGroup)
  }

  async function handleDuplicateCheck() {
    duplicateCheckLoading.value = true
    duplicateCheckOpen.value = true
    duplicateChecked.value = true
    try {
      duplicateGroups.value = await getDuplicateSites()
      options.toast.success(`检测完成：发现 ${duplicateGroups.value.length} 组重复站点。`)
    } catch (err) {
      options.toast.error(err instanceof Error ? err.message : '清理检测失败')
    } finally {
      duplicateCheckLoading.value = false
    }
  }

  async function handleSuggestedDuplicateMerge() {
    if (duplicateMergeLoading.value) {
      return
    }

    let groups = duplicateGroups.value
    if (!groups.length) {
      duplicateCheckLoading.value = true
      try {
        groups = await getDuplicateSites()
        duplicateGroups.value = groups
        duplicateChecked.value = true
      } catch (err) {
        options.toast.error(err instanceof Error ? err.message : '清理检测失败')
        duplicateCheckLoading.value = false
        return
      }
      duplicateCheckLoading.value = false
    }

    if (!groups.length) {
      duplicateCheckOpen.value = true
      options.toast.success('未发现需要合并的重复站点。')
      return
    }

    const duplicateSiteCount = groups.reduce((total, group) => total + Math.max(group.site_ids.length - 1, 0), 0)

    Modal.confirm({
      title: '按建议合并重复站点',
      content: `将合并 ${groups.length} 组重复站点，删除 ${duplicateSiteCount} 条重复记录，并保留每组建议站点。`,
      okText: '开始合并',
      cancelText: '取消',
      async onOk() {
        duplicateMergeLoading.value = true
        try {
          const result = await mergeDuplicateSites()
          await options.loadData(options.selectedId.value)
          duplicateGroups.value = await getDuplicateSites()
          duplicateChecked.value = true
          duplicateCheckOpen.value = true
          options.toast.success(
            result.merged_group_count
              ? `已合并 ${result.merged_group_count} 组，删除 ${result.deleted_site_count} 条重复记录。`
              : '未发现需要合并的重复站点。',
          )
        } catch (err) {
          options.toast.error(err instanceof Error ? err.message : '按建议合并失败')
          throw err
        } finally {
          duplicateMergeLoading.value = false
        }
      },
    })
  }

  return {
    duplicateCheckOpen,
    duplicateCheckLoading,
    duplicateMergeLoading,
    duplicateChecked,
    duplicateSearch,
    filteredDuplicateGroups,
    duplicateGroupRowKey,
    duplicateSuggestedSiteName,
    handleDuplicateCheck,
    handleSuggestedDuplicateMerge,
  }
}
