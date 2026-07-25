import { checkSignoz } from '../lib/signoz.js'
/** Checks SigNoz connectivity. */
export async function status(): Promise<void> { await checkSignoz(); console.log('SigNoz is reachable.') }
