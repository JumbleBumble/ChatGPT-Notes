import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: '**/*.spec.mts',
	outputDir: 'temp/playwright-results',
	timeout: 90_000,
	fullyParallel: false,
	workers: 1,
	reporter: [['list']],
	use: {
		headless: true,
	},
})
