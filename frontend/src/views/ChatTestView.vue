<script setup lang="ts">
import ShellLayout from '../components/ShellLayout.vue'
import ChatTestPageContent from '../components/chat/ChatTestPageContent.vue'
import { useChatTestController } from '../chatTestController'
import '../styles/workspace-surfaces.css'
import '../styles/chat-test-shell.css'
import '../styles/chat-test-history.css'
import '../styles/chat-test-composer.css'
import '../styles/chat-test-image-size.css'
import '../styles/chat-test-responsive.css'

const view = useChatTestController()
</script>

<template>
  <ShellLayout class="session-layout-shell">
    <ChatTestPageContent :view="view" />
  </ShellLayout>
</template>
