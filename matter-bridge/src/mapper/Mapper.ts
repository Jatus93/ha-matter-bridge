/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from '../home-assistant/HAmiddleware.js';
import { HassEntity } from '../home-assistant/HAssTypes.js';
import { Bridge } from '../matter/Bridge.js';
import { setLights } from './devices/lights/index.js';
import { setWindowCovers } from './devices/window-covers/index.js';

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
    LOGGER.info('Mapper init');
    const entityKeys = Object.keys(entities);
    entityKeys.forEach((key) => {
        LOGGER.info(
            'reading info ',
            entities[key].length,
            key,
            ' key devices',
        );
        const setEntitiesFunction = entitiesToFunction.get(key);
        LOGGER.debug(
            'Mapped key with function',
            entitiesToFunction.has(key),
            setEntitiesFunction === undefined,
        );
        LOGGER.debug('Mapped key', entitiesToFunction.has(key));
        if (entitiesToFunction.has(key) && setEntitiesFunction) {
            LOGGER.info('adding', entities[key].length, key);
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
