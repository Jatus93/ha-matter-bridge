import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from '../home-assistant/HAmiddleware.js';
import { HassEntity } from '../home-assistant/HAssTypes.js';
import { Bridge } from '../matter/Bridge.js';
import { setLights } from './devices/lights/index.js';
import { setWindowCovers } from './devices/window-covers/index.js';
import { setSwitches } from './devices/switches/index.js';

const LOGGER = new Logger('Mapper');

type SetterFunction = (
    entities: HassEntity[],
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) => Promise<void>;

const entitiesToFunction = new Map<string, SetterFunction>([
    ['light', setLights],
    ['cover', setWindowCovers],
    ['switch', setSwitches],
]);

async function setHasEntities(
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<void> {
    const entities = await haMiddleware.getStatesPartitionedByType();
    LOGGER.info('Mapper init');
    const entityKeys = Object.keys(entities);
    for (const key of entityKeys) {
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
            await setEntitiesFunction(
                entities[key],
                haMiddleware,
                bridge,
            );
        }
    }
}

export async function addAllDevicesToBridge(
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<void> {
    await setHasEntities(haMiddleware, bridge);
    await haMiddleware.subscribe();
}
