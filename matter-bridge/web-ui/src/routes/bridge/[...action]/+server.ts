import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';

import { existsSync } from 'fs';

const basePath: string = process.env.CONFIG_PATH || '';
const fileLock: string = process.env.BRIDGE_LOCK || '';
const path = `${basePath}/${fileLock}`;

async function setBridge(start: boolean) {
	await fs.writeFile(path, JSON.stringify({ start }));
}

export async function POST(event: RequestEvent) {
	console.debug({ event });
	const requested = event.params['action'];
	console.log({ requested });
	await setBridge(requested === 'start');
	return json({ ok: true });
}

async function loadStatus() {
	const fileExtist = existsSync(path);
	const result = JSON.parse(
		(
			await fs.readFile(
				path,
				fileExtist
					? undefined
					: {
							flag: 'w+'
						}
			)
		).toString()||'{}'
	);
	return result;
}

export async function GET(event: RequestEvent) {
	console.debug({ event });

	const data = await loadStatus();

	return json(data);
}
