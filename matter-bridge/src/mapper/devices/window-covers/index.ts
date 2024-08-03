import { HAMiddleware } from '@ha/HAmiddleware.js';
import { HassEntity } from '@ha/HAssTypes.js';
import {
    AddHaDeviceToBridge,
    Bridge,
    StateQueue,
} from '../MapperType.js';
import { addWindowCover } from './WindowCovers.js';

export * from './WindowCovers.js';

const WINDOW_COVERS_MAP_MAP_FUNCTIONS: Map<
    string,
    AddHaDeviceToBridge
> = new Map<string, AddHaDeviceToBridge>([['cover', addWindowCover]]);

const WINDOW_COVERS_MAP: Map<string, StateQueue> = new Map<
    string,
    StateQueue
>();

export async function setWindowCovers(
    windowCovers: HassEntity[],
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<void> {
    for (const entity of windowCovers) {
        const key = entity.entity_id.split('.')[0];
        const windoCoverFunction =
            WINDOW_COVERS_MAP_MAP_FUNCTIONS.get(key);
        if (!windoCoverFunction) {
            throw new Error('Missing ' + key);
        }
        WINDOW_COVERS_MAP.set(
            entity.entity_id,
            await windoCoverFunction(entity, haMiddleware, bridge),
        );
    }
}
