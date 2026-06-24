<script setup lang="ts">
import SettingsPageContent from '../components/settings/SettingsPageContent.vue'
import { useSettingsViewController } from '../settingsViewController'
import '../styles/workspace-surfaces.css'
import '../styles/settings-view.css'
import '../styles/settings-runtime.css'

const view = useSettingsViewController()
</script>

<template>
  <SettingsPageContent :view="view" />
</template>
