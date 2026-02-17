
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        fileParallelism: false, // Avoid race conditions in DB tests
        setupFiles: ['./tests/setup.ts'],
    },
})
