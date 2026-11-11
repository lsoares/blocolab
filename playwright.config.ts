import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'src',
  testMatch: '**/*.spec.ts',
  use: { baseURL: 'http://localhost:5181' },
  webServer: { command: 'npx vite --port 5181 --strictPort', url: 'http://localhost:5181', reuseExistingServer: true },
})
