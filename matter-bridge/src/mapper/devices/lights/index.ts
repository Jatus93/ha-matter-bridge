import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from '@ha/HAmiddleware.js';
import { HassEntity } from '@ha/HAssTypes.js';
import {
    AddHaDeviceToBridge,
    Bridge,
    StateQueue,
} from '../MapperType.js';
import { addDimmableLightDevice } from './DimmableLightDevice.js';
import { addOnOffLightDevice } from './OnOffLightDevice.js';
import { addRGBLightDevice } from './RGBLighDevice.js';

export * from './DimmableLightDevice.js';
export * from './OnOffLightDevice.js';

const LOGGER = new Logger('Lights');

const LIGHTS_MAP_FUNCTIONS: Map<string, AddHaDeviceToBridge> =
    new Map<string, AddHaDeviceToBridge>([
        ['onoff', addOnOffLightDevice],
        ['rgb', addRGBLightDevice],
        ['brightness', addDimmableLightDevice],
    ]);

const LIGHTS_MAP: Map<string, StateQueue> = new Map<
    string,
    StateQueue
>();

export function setLights(
    lights: HassEntity[],
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) {
    lights.forEach(async (entity) => {
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
            await lightBuildFunction(entity, haMiddleware, bridge),
        );
    });
}
