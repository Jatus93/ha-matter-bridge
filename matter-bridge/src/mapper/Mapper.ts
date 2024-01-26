/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    addDimmerableLightDevice,
    addOnOffLightDevice,
} from './devices/lights';
import { HassEntity } from '../home-assistant/HAssTypes';
import { Bridge } from '../matter';
import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from '../home-assistant/HAmiddleware';

const LOGGER = new Logger('Mapper');

const lightsMap: Map<
    string,
    (haEntity: HassEntity, haMiddleware: HAMiddleware, bridge: Bridge) => void
> = new Map<
    string,
    (haEntity: HassEntity, haMiddleware: HAMiddleware, bridge: Bridge) => void
>([
    ['onoff', addOnOffLightDevice],
    ['rgb', addDimmerableLightDevice],
    ['brightness', addDimmerableLightDevice],
]);

function setLights(
    lights: HassEntity[],
    haMiddleware: HAMiddleware,
    bridge: Bridge
) {
    lights.forEach((entity) => {
        LOGGER.info({ colormodes: entity.attributes['supported_color_modes'] });
        const key = (entity.attributes['supported_color_modes'] as string[])[0];
        LOGGER.info({ key });
        const lightBuildFunction = lightsMap.get(key);
        if (!lightBuildFunction) {
            throw new Error('Missing ' + key);
        }
        return lightBuildFunction(entity, haMiddleware, bridge);
    });
}

async function setHasEnties(
    haMiddleware: HAMiddleware,
    bridge: Bridge
): Promise<void> {
    const entities = await haMiddleware.getStatesPartitionedByType();
    LOGGER.info({ entities });
    if (entities['light']) {
        LOGGER.info('adding ', entities['light'].length, 'light devices');
        setLights(entities['light'], haMiddleware, bridge);
    }
}

export async function addAllDevicesToBridge(
    haMiddleware: HAMiddleware,
    bridge: Bridge
): Promise<void> {
    await setHasEnties(haMiddleware, bridge);
    haMiddleware.subscribe();
}
