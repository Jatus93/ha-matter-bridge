import { HAMiddleware } from '../../../home-assistant/HAmiddleware.js';
import { HassEntity } from '../../../home-assistant/HAssTypes.js';
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

export function setWindowCovers(
    windowCovers: HassEntity[],
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) {
    windowCovers.forEach((entity) => {
        const key = 'cover';
        const windoCoverFunction =
            WINDOW_COVERS_MAP_MAP_FUNCTIONS.get(key);
        if (!windoCoverFunction) {
            throw new Error('Missing ' + key);
        }
        WINDOW_COVERS_MAP.set(
            entity.entity_id,
            windoCoverFunction(entity, haMiddleware, bridge),
        );
    });
}
