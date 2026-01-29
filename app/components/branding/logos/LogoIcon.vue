<script setup lang="ts">
  const props = withDefaults(defineProps<{
    plus?: string,
    A?: string,
    ring?: string,
    text?: string,
    theme?: '' | "light" | "dark"
  }>(), {
    plus: '#44CEFF',
    A: '#44CEFF',
    ring: '#CBD5E1',
    text: '#3B394E', // Dark Text #3B394E || white
    theme: ''
  })
  
  const theme = computed(() => props.theme)
  
  const A = computed(() => {
    if(theme.value) {
      return theme.value === 'light' ? '#44CEFF' : '#44CEFF'
    } else {
      return props.A
    }
  })
  const plus = computed(() => {
    if(theme.value) {
      return theme.value === 'light' ? '#44CEFF' : '#44CEFF'
    } else {
      return props.plus
    }
  })

  </script>
  
  <template>
    <svg class="logo-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="54" :stroke="props.ring" stroke-width="3" />
      <g transform="translate(60 60) scale(0.38) translate(-191 -92)">
        <path d="M187.051 127.676L171.426 86.7578L156.68 127.676H187.051ZM235.488 185H208.633L194.57 148.086H149.453L135.977 185H110.488L160.098 55.9961H182.949L235.488 185Z" :fill="A"/>
        <path d="M271.955 44.3804H245.207V71.1284H227.563V44.3804H200.815V26.978H227.563V0.22998H245.207V26.978H271.955V44.3804Z" :fill="plus"/>
      </g>
    </svg>
  </template>
  
  <style scoped>
  </style>
