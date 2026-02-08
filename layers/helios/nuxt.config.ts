export default defineNuxtConfig({
  $meta: {
    name: 'helios',
  },
  runtimeConfig: {
    public: {
      helios: {
        fragmentsDir: 'app/helios/fragments',
        generatedDir: 'app/helios/generated',
        settingsFile: 'app/helios/generated/type.settings.json',
        unoGeneratedFile: 'app/helios/generated/uno.generated.ts',
        scssDir: 'app/helios/scss',
      },
    },
  },
})
