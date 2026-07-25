import { execFileSync } from 'node:child_process'

/** Returns the git blob hash of a prompt file. */
export function getPromptBlobHash(filePath: string): string {
  return execFileSync('git', ['hash-object', filePath], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
}
/** Resolves the configured prompt path from the environment. */
export function getPromptPath(): string { return process.env.MERIDIAN_PROMPT_PATH ?? 'prompts/' }
