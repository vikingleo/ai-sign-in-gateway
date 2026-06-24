import { computed, ref } from 'vue'
import { activateSiteQueueTask, getSiteQueue } from '../api'
import type { QueueTask, Site } from '../types'
import type { useToast } from '../toast'

type Toast = ReturnType<typeof useToast>

type UseSitesQueueOptions = {
  toast: Toast
}

export function useSitesQueue({ toast }: UseSitesQueueOptions) {
  const queueOpen = ref(false)
  const queueLoading = ref(false)
  const queueActivatingTaskKey = ref('')
  const queueSite = ref<Site | null>(null)
  const queueTasks = ref<QueueTask[]>([])

  const queueSiteName = computed(() => queueSite.value?.name ?? '')

  async function loadQueueTasks(site: Site) {
    queueLoading.value = true
    try {
      queueTasks.value = await getSiteQueue(site.id)
    } catch (err) {
      queueTasks.value = []
      toast.error(err instanceof Error ? err.message : '队列任务加载失败')
    } finally {
      queueLoading.value = false
    }
  }

  async function openQueue(site: Site) {
    queueSite.value = site
    queueOpen.value = true
    await loadQueueTasks(site)
  }

  async function refreshQueue() {
    if (!queueSite.value) return
    await loadQueueTasks(queueSite.value)
  }

  async function activateQueueTask(task: QueueTask) {
    if (!queueSite.value || queueActivatingTaskKey.value) return
    queueActivatingTaskKey.value = task.task_key
    try {
      const updated = await activateSiteQueueTask(queueSite.value.id, task.task_key)
      queueTasks.value = queueTasks.value.map((item) => (item.task_key === updated.task_key ? updated : item))
      toast.success(updated.last_message || '队列任务已完成。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '队列任务更新失败')
    } finally {
      queueActivatingTaskKey.value = ''
    }
  }

  function queueTaskRowKey(record: QueueTask) {
    return record.task_key
  }

  return {
    queueOpen,
    queueLoading,
    queueActivatingTaskKey,
    queueSite,
    queueSiteName,
    queueTasks,
    openQueue,
    refreshQueue,
    activateQueueTask,
    queueTaskRowKey,
  }
}
