import fs from 'fs/promises';
import type { HassEntityLocal } from '@matter-bridge/service/src/home-assistant/HAssTypes';
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

const basePath: string = process.env.CONFIG_PATH || '';

function isHassEntityLocal(data: object): data is HassEntityLocal {
	const keys = Object.keys(data);
	return keys.includes('visible') && keys.includes('custom_name') && keys.includes('id');
}

export async function GET(event: RequestEvent) {
	console.debug({ event });
	const data = JSON.parse((await fs.readFile(`${basePath}/confDevices.json`)).toString()) as {
		[key: string]: HassEntityLocal;
	};
	const requestedId = event.params['id'];
	if (requestedId && Object.keys(data).includes(requestedId)) {
		return json(data[requestedId]);
	}
	return json(data);
}

export async function POST(event: RequestEvent) {
	console.debug({ event });
	const receivedElement = await event.request.json();
	if (!isHassEntityLocal(receivedElement)) {
		return { status: 400, body: 'invalid body' };
	}
	const data = JSON.parse((await fs.readFile(`${basePath}/confDevices.json`)).toString()) as {
		[key: string]: HassEntityLocal;
	};
	const id = receivedElement.id;
	data[id] = receivedElement;
	await fs.writeFile(`${basePath}/confDevices.json`, JSON.stringify(data));
	return json({ ok: true });
}
