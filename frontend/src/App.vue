<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'

const theme = {
  token: {
    borderRadius: 8,
    borderRadiusLG: 8,
    borderRadiusSM: 6,
    borderRadiusXS: 4,
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    colorSuccess: '#16a34a',
    colorWarning: '#f59e0b',
    colorError: '#dc2626',
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#edf2f7',
    colorFillAlter: '#f8fafc',
    colorFillSecondary: '#f1f5f9',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorTextTertiary: '#94a3b8',
    fontFamily: "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    controlHeight: 36,
    controlHeightLG: 40,
    controlHeightSM: 28,
    controlOutline: 'rgba(37, 99, 235, 0.16)',
  },
  components: {
    Card: {
      borderRadiusLG: 8,
      paddingLG: 16,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
    },
    InputNumber: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Table: {
      borderColor: '#e2e8f0',
      headerBg: '#f8fafc',
      headerColor: '#334155',
      rowHoverBg: '#f8fafc',
    },
    Menu: {
      colorItemBgHover: '#f8fafc',
      colorItemBgSelected: '#eff6ff',
      colorItemText: '#334155',
      colorItemTextHover: '#2563eb',
      colorItemTextSelected: '#2563eb',
      itemMarginInline: 8,
      radiusItem: 8,
    },
  },
}
</script>

<template>
  <a-config-provider :theme="theme" :locale="zhCN">
    <router-view />
  </a-config-provider>
</template>
