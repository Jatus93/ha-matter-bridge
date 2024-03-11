/* eslint-disable @typescript-eslint/no-explicit-any */
import { setLights } from './devices/lights/index.js';
import { setWindowCovers } from './devices/window-cover/index.js';
import { Bridge } from '../matter-v2/index.js';
import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from '../home-assistant/HAmiddleware.js';
import { HassEntity } from '../home-assistant/HAssTypes.js';

const LOGGER = new Logger('Mapper');
const entitiesToFunction = new Map<
    string,
    (
        entities: HassEntity[],
        haMiddleware: HAMiddleware,
        bridge: Bridge,
    ) => void
>([
    ['light', setLights],
    ['cover', setWindowCovers],
]);

async function setHasEntities(
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<void> {
    const entities = await haMiddleware.getStatesPartitionedByType();
    LOGGER.info({ entities });
    const entityKeys = Object.keys(entities);
    entityKeys.forEach((key) => {
        LOGGER.info('adding ', entities[key].length, 'key devices');
        const setEntitiesFunction = entitiesToFunction.get('key');
        if (entitiesToFunction.has(key) && setEntitiesFunction) {
            setEntitiesFunction(entities[key], haMiddleware, bridge);
        }
    });
}

export async function addAllDevicesToBridge(
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<void> {
    await setHasEntities(haMiddleware, bridge);
    haMiddleware.subscribe();
}
