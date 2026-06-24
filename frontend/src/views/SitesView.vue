<script setup lang="ts">
import ShellLayout from '../components/ShellLayout.vue'
import SitesPageContent from '../components/sites/SitesPageContent.vue'
import { useSitesViewController } from '../composables/useSitesViewController'
import '../styles/management-surfaces.css'
import '../styles/management-responsive-surfaces.css'

const view = useSitesViewController()
</script>

<template>
  <ShellLayout>
    <SitesPageContent :view="view" />
  </ShellLayout>
</template>

<style src="../styles/sites-view.css"></style>
