import { test, expect } from './fixtures.mts'

test('captures a short, fully-mounted thread without scrolling', async ({
	mockThread,
	runCapture,
}) => {
	await mockThread({
		turnCount: 6,
		windowSize: 6,
		backfillChunk: 2,
		backfillDelayMs: 50,
	})

	const result = await runCapture()

	expect(result.source).toBe('dom')
	expect(result.turnCount).toBe(6)
	expect(result.missingTurns).toEqual([])
	expect(result.ordering).toBe('ok')
})

test('captures older turns that require scrolling up to backfill', async ({
	mockThread,
	runCapture,
}) => {
	await mockThread({
		turnCount: 30,
		windowSize: 6,
		backfillChunk: 4,
		backfillDelayMs: 120,
	})

	const result = await runCapture()

	expect(result.source).toBe('dom')
	expect(result.turnCount).toBe(30)
	expect(result.missingTurns).toEqual([])
	expect(result.ordering).toBe('ok')
})

test('captures an assistant turn that is still streaming when the crawl starts', async ({
	mockThread,
	runCapture,
}) => {
	await mockThread({
		turnCount: 10,
		windowSize: 10,
		backfillChunk: 2,
		backfillDelayMs: 50,
		streamFirstAssistant: true,
	})

	const result = await runCapture()

	expect(result.source).toBe('dom')
	expect(result.data?.text).toContain('Assistant answer 1:')
})

test('does not stop early when the first history chunk is slow to load', async ({
	mockThread,
	runCapture,
}) => {
	await mockThread({
		turnCount: 24,
		windowSize: 6,
		backfillChunk: 4,
		backfillDelayMs: 150,
		slowFirstBackfillMs: 4_000,
	})

	const result = await runCapture()

	expect(result.source).toBe('dom')
	expect(result.turnCount).toBe(24)
	expect(result.missingTurns).toEqual([])
})

test('captures turns that have no data-message-id (regenerated turns)', async ({
	mockThread,
	runCapture,
}) => {
	await mockThread({
		turnCount: 12,
		windowSize: 8,
		backfillChunk: 4,
		backfillDelayMs: 80,
		omitMessageIds: true,
	})

	const result = await runCapture()

	expect(result.source).toBe('dom')
	expect(result.turnCount).toBe(12)
	expect(result.missingTurns).toEqual([])
})

test('assistant-only mode keeps assistant turns and drops user turns', async ({
	mockThread,
	runCapture,
}) => {
	await mockThread({
		turnCount: 10,
		windowSize: 10,
		backfillChunk: 2,
		backfillDelayMs: 50,
	})

	const result = await runCapture('assistant')

	expect(result.source).toBe('dom')
	expect(result.data?.text).toContain('Assistant answer 1:')
	expect(result.data?.text).not.toContain('User question 0:')
	expect(result.data?.text).not.toContain('User question 2:')
})

test('keeps the end-of-thread turn when it collapses after the dialog opens', async ({
	mockThread,
	runCapture,
}) => {
	await mockThread({
		turnCount: 12,
		windowSize: 12,
		backfillChunk: 2,
		backfillDelayMs: 50,
		collapseLastTurnAfterMs: 300,
	})

	const result = await runCapture()

	expect(result.source).toBe('dom')
	expect(result.data?.text).toContain('Assistant answer 11:')
	expect(result.turnCount).toBe(12)
})

test('reaches the very top across many small backfill chunks', async ({
	mockThread,
	runCapture,
}) => {
	await mockThread({
		turnCount: 60,
		windowSize: 4,
		backfillChunk: 2,
		backfillDelayMs: 90,
	})

	const result = await runCapture()

	expect(result.source).toBe('dom')
	expect(result.turnCount).toBe(60)
	expect(result.missingTurns).toEqual([])
	expect(result.ordering).toBe('ok')
})
