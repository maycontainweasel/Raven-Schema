<script setup lang="ts">
import { useCRUD, useTypesense } from '~~/modules/schema-kit/runtime'

const typesenseStatus = ref<'idle' | 'ready' | 'error'>('idle')
const typesenseError = ref('')
const typesenseCollections = ref<any[]>([])

async function testTypesense() {
  try {
    const typesense = useTypesense()
    typesenseStatus.value = 'ready'
    typesenseError.value = ''
    typesenseCollections.value = await typesense.getRemoteCollections()
  } catch (error: any) {
    typesenseStatus.value = 'error'
    typesenseError.value = error?.message ?? String(error)
    typesenseCollections.value = []
  }
}

async function getQuestion() {
  const { $processResult } = useCRUD()

  const result = await $processResult('question.create', {
    qid: 123132,
    question: 'This is a question',
  }, {
    instance: 'test',
    rootInstance: 'test',     // IMPORTANT: avoid default 'pm'
    consoleLogging: true,
    logFailures: true,
  })

  console.log('full result', result)
}

onMounted(() => {
  const rc = useRuntimeConfig()

  console.log("rc", rc)
})

</script>

<template>
  <div class="stack" style="padding: 2rem;">
    <div class="card">
      <h3>SchemaDocs Smoke Tests</h3>
      <div class="row" style="margin-top: 1rem;">
        <button class="button" @click="getQuestion">Test a router</button>
        <button class="button outline" @click="testTypesense">Test Typesense client</button>
      </div>
      <div v-if="typesenseStatus !== 'idle'" class="inset" style="margin-top: 1rem;">
        <strong>Status:</strong> {{ typesenseStatus }}
        <div v-if="typesenseError" class="error" style="margin-top: 0.5rem;">
          {{ typesenseError }}
        </div>
        <div v-else style="margin-top: 0.5rem;">
          Collections: {{ typesenseCollections.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
</style>
