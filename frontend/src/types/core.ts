export interface AdminUser {
  id: number
  username: string
  role: 'super_admin' | 'admin' | string
  is_enabled: boolean
  last_login_at?: string | null
  created_at: string
  updated_at: string
}

export interface FieldDescriptor {
  name: string
  label: string
  type: 'text' | 'password' | 'textarea' | 'number' | 'url'
  placeholder: string
  required: boolean
  help_text: string
}

export interface PluginMeta {
  key: string
  name: string
  description: string
  credential_fields: FieldDescriptor[]
  config_fields: FieldDescriptor[]
  capabilities: string[]
  auth_entry_path: string
  auth_entry_label: string
  auth_hint: string
}

export interface FeatureMeta {
  key: string
  name: string
  description: string
  frontend_path: string
  default_enabled: boolean
  enabled: boolean
}
