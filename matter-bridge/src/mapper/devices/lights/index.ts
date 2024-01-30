import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from '../../../home-assistant/HAmiddleware';
import { HassEntity } from '../../../home-assistant/HAssTypes';
import { AddHaDeviceToBridge, Bridge } from '../MapperType';
import { addDimmableLightDevice } from './DimmableLightDevice';
import { addOnOffLightDevice } from './OnOffLightDevice';
import { Device } from '@project-chip/matter-node.js/device';

export * from './DimmableLightDevice';
export * from './OnOffLightDevice';

const LOGGER = new Logger('Lights');

const LIGHTS_MAP_FUNCTIONS: Map<string, AddHaDeviceToBridge> =
    new Map<string, AddHaDeviceToBridge>([
        ['onoff', addOnOffLightDevice],
        ['rgb', addDimmableLightDevice],
        ['brightness', addDimmableLightDevice],
    ]);

const LIGHTS_MAP: Map<string, Device> = new Map<string, Device>();

export function setLights(
    lights: HassEntity[],
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) {
    lights.forEach((entity) => {
        LOGGER.info({
            colormodes: entity.attributes['supported_color_modes'],
        });
        const key = (
            entity.attributes['supported_color_modes'] as string[]
        )[0];
        LOGGER.info({ key });
        const lightBuildFunction = LIGHTS_MAP_FUNCTIONS.get(key);
        if (!lightBuildFunction) {
            throw new Error('Missing ' + key);
        }
        LIGHTS_MAP.set(
            entity.entity_id,
            lightBuildFunction(entity, haMiddleware, bridge),
        );
    });
}
