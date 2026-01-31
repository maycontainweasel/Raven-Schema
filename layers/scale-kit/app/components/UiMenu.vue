<script setup lang="ts">
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'

const props = withDefaults(
  defineProps<{
    label?: string
    items: { label: string; href?: string; action?: () => void }[]
  }>(),
  { label: 'Views' }
)
</script>

<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton class="ui-btn-ghost flex items-center gap-2">
      <span class="i-lucide:menu text-base" />
      <span>{{ props.label }}</span>
      <span class="i-lucide:chevron-down text-sm" />
    </MenuButton>
    <MenuItems class="ui-menu-items">
      <MenuItem v-for="item in props.items" :key="item.label" v-slot="{ active }">
        <component
          :is="item.href ? 'a' : 'button'"
          :href="item.href"
          type="button"
          class="ui-menu-item"
          :class="{ 'ui-menu-item--active': active }"
          @click="item.action?.()"
        >
          {{ item.label }}
        </component>
      </MenuItem>
    </MenuItems>
  </Menu>
</template>
