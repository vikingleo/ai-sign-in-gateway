import { computed, reactive, ref } from 'vue'
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  getMe,
  updateAdminAccount,
  updateAdminUser,
} from './api'
import { createAdminUserForm } from './settingsViewModel'
import type { AdminUser } from './types'

type SettingsToast = {
  error: (message: string) => void
  success: (message: string) => void
}

export function useSettingsAccountController({ toast }: { toast: SettingsToast }) {
  const accountLoading = ref(false)
  const adminUsersLoading = ref(false)
  const adminUserSavingID = ref<number | null>(null)
  const adminUserDeletingID = ref<number | null>(null)
  const currentUsername = ref('')
  const currentAdmin = ref<AdminUser | null>(null)
  const adminUsers = ref<AdminUser[]>([])
  const canManageAdminUsers = computed(() => currentAdmin.value?.role === 'super_admin')
  const accountForm = reactive({
    new_username: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const adminUserCreateForm = reactive(createAdminUserForm())
  const adminUserPasswordEdits = reactive<Record<number, string>>({})

  async function loadCurrentAccount() {
    try {
      const me = await getMe()
      currentAdmin.value = me
      currentUsername.value = me.username
      accountForm.new_username = me.username
      if (me.role === 'super_admin') {
        await loadAdminUsers(false)
      } else {
        adminUsers.value = []
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取当前账号失败')
    }
  }

  async function loadAdminUsers(showError = true) {
    if (!canManageAdminUsers.value) {
      adminUsers.value = []
      return
    }
    adminUsersLoading.value = true
    try {
      adminUsers.value = await getAdminUsers()
    } catch (err) {
      adminUsers.value = []
      if (showError) {
        toast.error(err instanceof Error ? err.message : '读取管理员列表失败')
      }
    } finally {
      adminUsersLoading.value = false
    }
  }

  function validateAccountForm() {
    const usernameChanged = accountForm.new_username.trim().length > 0 && accountForm.new_username.trim() !== currentUsername.value
    const passwordChanged = accountForm.new_password.length > 0
    if (!accountForm.current_password) {
      toast.error('请填写当前密码以确认身份。')
      return false
    }
    if (!usernameChanged && !passwordChanged) {
      toast.error('请至少修改用户名或密码中的一项。')
      return false
    }
    if (passwordChanged && accountForm.new_password.length < 6) {
      toast.error('新密码至少 6 位。')
      return false
    }
    if (passwordChanged && accountForm.new_password !== accountForm.confirm_password) {
      toast.error('两次输入的新密码不一致。')
      return false
    }
    return true
  }

  async function saveAccount() {
    if (!validateAccountForm()) return
    const trimmedUsername = accountForm.new_username.trim()
    const usernameChanged = trimmedUsername.length > 0 && trimmedUsername !== currentUsername.value
    const passwordChanged = accountForm.new_password.length > 0
    accountLoading.value = true
    try {
      const result = await updateAdminAccount({
        current_password: accountForm.current_password,
        new_username: usernameChanged ? trimmedUsername : undefined,
        new_password: passwordChanged ? accountForm.new_password : undefined,
      })
      currentAdmin.value = result.user
      currentUsername.value = result.user.username
      accountForm.new_username = result.user.username
      accountForm.current_password = ''
      accountForm.new_password = ''
      accountForm.confirm_password = ''
      toast.success('账号已更新，下次登录请使用新凭据。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '账号更新失败')
    } finally {
      accountLoading.value = false
    }
  }

  async function createAdmin() {
    const username = adminUserCreateForm.username.trim()
    if (!username) {
      toast.error('请填写用户名。')
      return
    }
    if (adminUserCreateForm.password.length < 6) {
      toast.error('密码至少 6 位。')
      return
    }
    adminUsersLoading.value = true
    try {
      await createAdminUser({
        username,
        password: adminUserCreateForm.password,
        role: adminUserCreateForm.role,
        is_enabled: adminUserCreateForm.is_enabled,
      })
      Object.assign(adminUserCreateForm, createAdminUserForm())
      await loadAdminUsers(false)
      toast.success('管理员已创建。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建管理员失败')
    } finally {
      adminUsersLoading.value = false
    }
  }

  async function saveAdminUser(user: AdminUser) {
    const username = user.username.trim()
    if (!username) {
      toast.error('用户名不能为空。')
      return
    }
    if (user.id === currentAdmin.value?.id && username !== currentUsername.value) {
      toast.error('请使用上方账号表单修改当前登录用户名。')
      user.username = currentUsername.value
      return
    }
    const newPassword = (adminUserPasswordEdits[user.id] || '').trim()
    if (user.id === currentAdmin.value?.id && newPassword) {
      toast.error('请使用上方账号表单修改当前登录密码。')
      adminUserPasswordEdits[user.id] = ''
      return
    }
    if (newPassword && newPassword.length < 6) {
      toast.error('新密码至少 6 位。')
      return
    }
    adminUserSavingID.value = user.id
    try {
      await updateAdminUser(user.id, {
        username,
        role: user.role,
        is_enabled: user.is_enabled,
        new_password: newPassword || undefined,
      })
      adminUserPasswordEdits[user.id] = ''
      if (user.id === currentAdmin.value?.id) {
        await loadCurrentAccount()
      } else {
        await loadAdminUsers(false)
      }
      toast.success('管理员已更新。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新管理员失败')
    } finally {
      adminUserSavingID.value = null
    }
  }

  async function removeAdminUser(user: AdminUser) {
    adminUserDeletingID.value = user.id
    try {
      await deleteAdminUser(user.id)
      await loadAdminUsers(false)
      toast.success('管理员已删除。')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除管理员失败')
    } finally {
      adminUserDeletingID.value = null
    }
  }

  return {
    accountLoading,
    adminUsersLoading,
    adminUserSavingID,
    adminUserDeletingID,
    currentUsername,
    currentAdmin,
    adminUsers,
    canManageAdminUsers,
    accountForm,
    adminUserCreateForm,
    adminUserPasswordEdits,
    loadCurrentAccount,
    loadAdminUsers,
    saveAccount,
    createAdmin,
    saveAdminUser,
    removeAdminUser,
  }
}
