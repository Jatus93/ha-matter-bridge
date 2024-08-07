import { HAMiddleware } from '@ha/HAmiddleware.js';
import { HassEntity } from '@ha/HAssTypes.js';
import {
    AddHaDeviceToBridge,
    Bridge,
    StateQueue,
} from '../MapperType.js';
import { getSwitchDeviceQueue } from './SwitchDevice.js';

export * from './SwitchDevice.js';

const SOCKET_MAP_FUNCTION: Map<string, AddHaDeviceToBridge> = new Map<
    string,
    AddHaDeviceToBridge
>([
    ['switch', getSwitchDeviceQueue],
    ['scene', getSwitchDeviceQueue],
]);

const SOCKET_MAP: Map<string, StateQueue> = new Map<
    string,
    StateQueue
>();

export async function setSwitches(
    windowCovers: HassEntity[],
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<void> {
    for (const entity of windowCovers) {
        const key = entity.entity_id.split('.')[0];
        const socketDevice = SOCKET_MAP_FUNCTION.get(key);
        if (!socketDevice) {
            throw new Error('Missing ' + key);
        }
        SOCKET_MAP.set(
            entity.entity_id,
            await socketDevice(entity, haMiddleware, bridge),
        );
    }
}
