export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  extends: ['docus'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },
  content: {
    experimental: {
      sqliteConnector: 'native'
    }
  },
  mcp: {
    name: 'Repo Lens MCP',
  },
  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: './app/assets/icons',
      },
    ],
  },
})
