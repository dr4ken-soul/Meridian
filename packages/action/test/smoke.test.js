import test from 'node:test'
import assert from 'node:assert/strict'
import { getPromptBlobHash, getPromptPath } from '../lib/git.js'

test('resolves the configured prompt and returns a git blob hash', () => {
  const promptPath = getPromptPath()
  assert.equal(promptPath, process.env.MERIDIAN_PROMPT_PATH ?? 'prompts/')
  const hash = getPromptBlobHash(promptPath)
  assert.match(hash, /^[a-f0-9]{40}$/)
})
