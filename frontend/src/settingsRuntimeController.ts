import { ref, type ComponentPublicInstance } from 'vue'
import {
  backupRuntimeDatabaseNow,
  deleteRuntimeDatabaseBackup,
  downloadRuntimeConfigArchive,
  downloadRuntimeDatabaseBackup,
  getRuntimeDatabaseBackups,
  logout,
  setRuntimeConfigDir,
  stopStaleRuntimePorts,
  uploadRuntimeDatabase,
} from './api'
import type { RuntimeDatabaseBackupFile, RuntimeStopPortResult, SettingsData } from './types'

type Toast = {
  success: (message: string) => void
  info: (message: string) => void
  error: (message: string) => void
}

type RuntimeControllerOptions = {
  form: SettingsData
  toast: Toast
  reloadData: () => Promise<void>
  goLogin: () => unknown
}

export function useSettingsRuntimeController({ form, toast, reloadData, goLogin }: RuntimeControllerOptions) {
  const runtimeStopLoading = ref(false)
  const configDirLoading = ref(false)
  const configArchiveDownloading = ref(false)
  const databaseImportLoading = ref(false)
  const databaseBackupLoading = ref(false)
  const databaseBackupDownloadName = ref('')
  const runtimeStopResults = ref<RuntimeStopPortResult[]>([])
  const databaseBackups = ref<RuntimeDatabaseBackupFile[]>([])
  const databaseBackupDir = ref('')
  const runtimeConfigDirInput = ref('')
  const runtimeDatabaseFileInput = ref<HTMLInputElement | null>(null)

  async function stopOldPorts() {
    runtimeStopLoading.value = true
    try {
      const result = await stopStaleRuntimePorts()
      runtimeStopResults.value = result.results
      const stoppedCount = result.results.filter((item) => item.stopped).length
      if (stoppedCount > 0) {
        toast.success(`已停止 ${stoppedCount} 个旧版本端口占用。`)
      } else {
        toast.info('没有可停止的旧版本端口占用。')
      }
      await reloadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '停止旧版本端口失败')
    } finally {
      runtimeStopLoading.value = false
    }
  }

  async function loadRuntimeConfigDir() {
    const configDir = runtimeConfigDirInput.value.trim()
    if (!configDir) {
      toast.error('请填写配置目录路径。')
      return
    }
    configDirLoading.value = true
    try {
      const result = await setRuntimeConfigDir(configDir)
      form.runtime_pending_config_dir = result.config_dir
      runtimeConfigDirInput.value = result.config_dir
      toast.success(result.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存配置目录失败')
    } finally {
      configDirLoading.value = false
    }
  }

  function bindRuntimeDatabaseFileInput(element: Element | ComponentPublicInstance | null) {
    runtimeDatabaseFileInput.value = element instanceof HTMLInputElement ? element : null
  }

  function selectRuntimeDatabase() {
    runtimeDatabaseFileInput.value?.click()
  }

  async function loadRuntimeDatabase(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    databaseImportLoading.value = true
    try {
      const result = await uploadRuntimeDatabase(file)
      form.runtime_database_path = result.database_path
      toast.success(result.message)
      logout()
      void goLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载数据库失败')
    } finally {
      databaseImportLoading.value = false
    }
  }

  async function loadDatabaseBackups(showError = true) {
    if (!form.database_backup_dir.trim()) {
      databaseBackups.value = []
      databaseBackupDir.value = ''
      return
    }
    databaseBackupLoading.value = true
    try {
      const result = await getRuntimeDatabaseBackups()
      databaseBackups.value = result.backups
      databaseBackupDir.value = result.backup_dir
    } catch (err) {
      databaseBackups.value = []
      databaseBackupDir.value = ''
      if (showError) {
        toast.error(err instanceof Error ? err.message : '读取备份列表失败')
      }
    } finally {
      databaseBackupLoading.value = false
    }
  }

  async function backupDatabaseNow() {
    databaseBackupLoading.value = true
    try {
      const result = await backupRuntimeDatabaseNow()
      databaseBackups.value = result.backups
      databaseBackupDir.value = result.backup_dir
      toast.success(result.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建数据库备份失败')
    } finally {
      databaseBackupLoading.value = false
    }
  }

  async function removeDatabaseBackup(name: string) {
    databaseBackupLoading.value = true
    try {
      const result = await deleteRuntimeDatabaseBackup(name)
      databaseBackups.value = result.backups
      databaseBackupDir.value = result.backup_dir
      toast.success('备份已删除。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除备份失败')
    } finally {
      databaseBackupLoading.value = false
    }
  }

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function downloadDatabaseBackup(name: string) {
    databaseBackupDownloadName.value = name
    try {
      const result = await downloadRuntimeDatabaseBackup(name)
      saveBlob(result.blob, result.filename)
      toast.success('数据库备份下载已开始。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '下载数据库备份失败')
    } finally {
      databaseBackupDownloadName.value = ''
    }
  }

  async function downloadConfigArchive() {
    configArchiveDownloading.value = true
    try {
      const result = await downloadRuntimeConfigArchive()
      saveBlob(result.blob, result.filename)
      toast.success('配置文件打包下载已开始。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '打包下载配置文件失败')
    } finally {
      configArchiveDownloading.value = false
    }
  }

  return {
    runtimeStopLoading,
    configDirLoading,
    configArchiveDownloading,
    databaseImportLoading,
    databaseBackupLoading,
    databaseBackupDownloadName,
    runtimeStopResults,
    databaseBackups,
    databaseBackupDir,
    runtimeConfigDirInput,
    bindRuntimeDatabaseFileInput,
    stopOldPorts,
    loadRuntimeConfigDir,
    selectRuntimeDatabase,
    loadRuntimeDatabase,
    loadDatabaseBackups,
    backupDatabaseNow,
    removeDatabaseBackup,
    downloadDatabaseBackup,
    downloadConfigArchive,
  }
}
