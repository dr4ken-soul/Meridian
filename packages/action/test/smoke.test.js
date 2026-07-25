import test from 'node:test'
import assert from 'node:assert/strict'
import { getPromptBlobHash, getPromptPath } from '../lib/lib/git.js'

test('resolves the configured prompt and returns a git blob hash', () => {
  process.env.MERIDIAN_PROMPT_PATH = '../../prompts/example.txt'
  const promptPath = getPromptPath()
  assert.equal(promptPath, '../../prompts/example.txt')
  const hash = getPromptBlobHash(promptPath)
  assert.match(hash, /^[a-f0-9]{40}$/)
})
