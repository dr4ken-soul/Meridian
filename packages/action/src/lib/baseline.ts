import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BaselineRecord } from '../types/index.js'
const directory = join(process.cwd(), '.meridian', 'baselines')
/** Loads a baseline keyed by prompt blob hash. */
export async function loadBaseline(promptHash: string): Promise<BaselineRecord | undefined> {
  try { return JSON.parse(await readFile(join(directory, `${promptHash}.json`), 'utf8')) as BaselineRecord } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error }
}
/** Stores a baseline JSON record in the repository. */
export async function saveBaseline(record: BaselineRecord): Promise<void> { await mkdir(directory, { recursive: true }); await writeFile(join(directory, `${record.promptHash}.json`), `${JSON.stringify(record, null, 2)}\n`, 'utf8') }
/** Lists all baseline records in storage. */
export async function listBaselines(): Promise<BaselineRecord[]> { await mkdir(directory, { recursive: true }); const files = (await readdir(directory)).filter((file) => file.endsWith('.json')); return Promise.all(files.map(async (file) => JSON.parse(await readFile(join(directory, file), 'utf8')) as BaselineRecord)) }
