import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'happy-dom',
		include: ['tests/**/*.test.ts'],
		setupFiles: ['tests/setup/dompurify.mock.ts'],
		globals: true,
		clearMocks: true,
		restoreMocks: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/lib/**/*.ts'],
		},
	},
})
