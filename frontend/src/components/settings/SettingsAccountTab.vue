<script setup lang="ts">
import { computed } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { SettingsViewController } from '../../settingsViewController'

const props = defineProps<{
  view: SettingsViewController
}>()

const isPasswordMismatch = computed(() =>
  props.view.accountForm.new_password.length > 0 &&
  props.view.accountForm.new_password !== props.view.accountForm.confirm_password,
)
</script>

<template>
  <div class="card-form">
    <div class="card-scroll card-scroll--padded">
      <a-form layout="vertical">
        <div class="account-meta">当前登录用户：<strong>{{ view.currentUsername || '...' }}</strong></div>
        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="新用户名">
              <a-input
                v-model:value="view.accountForm.new_username"
                aria-label="新用户名"
                placeholder="留空表示不修改用户名"
                autocomplete="off"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="当前密码" required>
              <a-input-password
                v-model:value="view.accountForm.current_password"
                aria-label="当前密码"
                placeholder="必须填写当前密码以确认身份"
                autocomplete="current-password"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="新密码">
              <a-input-password
                v-model:value="view.accountForm.new_password"
                aria-label="新密码"
                placeholder="留空表示不修改密码（至少 6 位）"
                autocomplete="new-password"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item
              label="确认新密码"
              :validate-status="isPasswordMismatch ? 'error' : undefined"
              :help="isPasswordMismatch ? '两次输入的新密码不一致。' : undefined"
            >
              <a-input-password
                v-model:value="view.accountForm.confirm_password"
                aria-label="确认新密码"
                placeholder="再次输入新密码"
                autocomplete="new-password"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="card-actions card-actions--left">
          <a-space>
            <a-button type="primary" :loading="view.accountLoading" :disabled="isPasswordMismatch" @click="view.saveAccount">
              更新账号
            </a-button>
          </a-space>
        </div>
        <small class="account-hint">
          修改成功后会自动续签当前登录凭据；修改用户名后旧登录凭据会失效。
        </small>

        <template v-if="view.canManageAdminUsers">
          <a-divider />
          <div class="admin-users-panel">
            <div class="admin-users-create">
              <a-input
                v-model:value="view.adminUserCreateForm.username"
                aria-label="新管理员用户名"
                placeholder="新管理员用户名"
                autocomplete="off"
              />
              <a-input-password
                v-model:value="view.adminUserCreateForm.password"
                aria-label="新管理员初始密码"
                placeholder="初始密码"
                autocomplete="new-password"
              />
              <a-select
                v-model:value="view.adminUserCreateForm.role"
                aria-label="新管理员角色"
                :options="view.roleOptions"
              />
              <a-switch
                class="app-switch app-switch--text"
                v-model:checked="view.adminUserCreateForm.is_enabled"
                aria-label="新管理员启用状态"
                checked-children="启用"
                un-checked-children="停用"
              />
              <a-button type="primary" :loading="view.adminUsersLoading" @click="view.createAdmin">
                <template #icon><PlusOutlined /></template>
                新增管理员
              </a-button>
            </div>

            <a-table
              class="admin-users-table"
              size="small"
              :data-source="view.adminUsers"
              :loading="view.adminUsersLoading"
              :pagination="false"
              :scroll="{ x: 1100 }"
              row-key="id"
            >
              <a-table-column title="用户名" key="username" :width="180">
                <template #default="{ record }">
                  <a-input
                    v-model:value="view.asAdminUser(record).username"
                    :aria-label="`${view.asAdminUser(record).username || '管理员'}用户名`"
                    autocomplete="off"
                    :disabled="view.asAdminUser(record).id === view.currentAdmin?.id"
                  />
                </template>
              </a-table-column>
              <a-table-column title="角色" key="role" :width="150">
                <template #default="{ record }">
                  <a-select
                    v-model:value="view.asAdminUser(record).role"
                    :aria-label="`${view.asAdminUser(record).username || '管理员'}角色`"
                    :options="view.roleOptions"
                    :disabled="view.asAdminUser(record).id === view.currentAdmin?.id"
                    style="width: 100%"
                  />
                </template>
              </a-table-column>
              <a-table-column title="状态" key="is_enabled" :width="120">
                <template #default="{ record }">
                  <a-switch
                    class="app-switch app-switch--text"
                    v-model:checked="view.asAdminUser(record).is_enabled"
                    :aria-label="`${view.asAdminUser(record).username || '管理员'}启用状态`"
                    checked-children="启用"
                    un-checked-children="停用"
                    :disabled="view.asAdminUser(record).id === view.currentAdmin?.id"
                  />
                </template>
              </a-table-column>
              <a-table-column title="新密码" key="new_password" :width="180">
                <template #default="{ record }">
                  <a-input-password
                    v-model:value="view.adminUserPasswordEdits[view.asAdminUser(record).id]"
                    :aria-label="`${view.asAdminUser(record).username || '管理员'}新密码`"
                    placeholder="留空不修改"
                    autocomplete="new-password"
                    :disabled="view.asAdminUser(record).id === view.currentAdmin?.id"
                  />
                </template>
              </a-table-column>
              <a-table-column title="最后登录" key="last_login_at" :width="170">
                <template #default="{ record }">
                  {{ view.formatOptionalTime(view.asAdminUser(record).last_login_at) }}
                </template>
              </a-table-column>
              <a-table-column title="标签" key="tag" :width="120">
                <template #default="{ record }">
                  <a-space size="small">
                    <a-tag :color="view.adminRoleColor(view.asAdminUser(record).role)">
                      {{ view.adminRoleLabel(view.asAdminUser(record).role) }}
                    </a-tag>
                  </a-space>
                </template>
              </a-table-column>
              <a-table-column title="操作" key="actions" :width="180">
                <template #default="{ record }">
                  <a-space size="small">
                    <a-button
                      size="small"
                      type="primary"
                      :loading="view.adminUserSavingID === view.asAdminUser(record).id"
                      @click="view.saveAdminUser(view.asAdminUser(record))"
                    >
                      保存
                    </a-button>
                    <a-popconfirm
                      title="确认删除这个管理员？"
                      ok-text="删除"
                      cancel-text="取消"
                      :disabled="view.asAdminUser(record).id === view.currentAdmin?.id"
                      @confirm="view.removeAdminUser(view.asAdminUser(record))"
                    >
                      <a-button
                        danger
                        size="small"
                        :disabled="view.asAdminUser(record).id === view.currentAdmin?.id"
                        :loading="view.adminUserDeletingID === view.asAdminUser(record).id"
                      >
                        删除
                      </a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </a-table-column>
            </a-table>
          </div>
        </template>
      </a-form>
    </div>
  </div>
</template>
