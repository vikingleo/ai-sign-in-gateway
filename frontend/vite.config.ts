import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

function resolveAntdChunk(id: string): string {
  if (id.includes('ant-design-vue/es/_util') || id.includes('ant-design-vue/lib/_util')) {
    return 'antd-util'
  }

  if (id.includes('ant-design-vue/es/vc-') || id.includes('ant-design-vue/lib/vc-')) {
    return 'antd-vc'
  }

  const match = id.match(/ant-design-vue\/(?:es|lib)\/([^/]+)/)
  const segment = match?.[1] ?? 'core'
  const normalized = segment.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()

  if (['config-provider', 'grid', 'layout', 'space'].includes(normalized)) {
    return 'antd-shell'
  }

  if (['button', 'checkbox', 'form', 'input', 'input-number', 'radio', 'select', 'switch'].includes(normalized)) {
    return 'antd-forms'
  }

  if (['alert', 'dropdown', 'message', 'modal', 'notification', 'popconfirm', 'spin'].includes(normalized)) {
    return 'antd-feedback'
  }

  if (['drawer', 'popover', 'tabs', 'tooltip'].includes(normalized)) {
    return 'antd-overlay'
  }

  if (['menu'].includes(normalized)) {
    return 'antd-navigation'
  }

  if (['avatar', 'empty', 'list', 'tag', 'typography'].includes(normalized)) {
    return 'antd-display'
  }

  if (['card', 'pagination', 'statistic', 'table'].includes(normalized)) {
    return 'antd-data'
  }

  return 'antd-core'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: 'src/components.d.ts',
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
          resolveIcons: false,
        }),
      ],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }
          if (id.includes('ant-design-vue')) {
            return resolveAntdChunk(id)
          }
          if (id.includes('@ant-design/icons-vue')) {
            return 'antd-icons'
          }
          if (id.includes('vue-router')) {
            return 'vue-router'
          }
          if (id.includes('/vue/')) {
            return 'vue-core'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8972',
        changeOrigin: true,
      },
    },
  },
})
