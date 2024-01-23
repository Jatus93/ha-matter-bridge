/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Device,
    DimmableLightDevice,
    OnOffLightDevice,
} from '@project-chip/matter.js/device';
import { HassEntity, HassEvent } from './HAssTypes';
import { Bridge, HAMiddleware } from '.';
import { MD5 } from 'crypto-js';
import { Logger } from '@project-chip/matter-node.js/log';

const DEVICE_ENTITY_MAP: {
    [k: string]: { haEntity: HassEntity; device: Device };
} = {};

const LOGGER = new Logger('Mapper');

function addRGBLightDeviceToMap(
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge
): void {
    const device = new DimmableLightDevice();
    const serialFromId = MD5(haEntity.entity_id).toString();

    device.addOnOffListener((value, oldValue) => {
        if (value !== oldValue) {
            haMiddleware.callAService('light', value ? 'turn_on' : 'turn_off', {
                entity_id: haEntity.entity_id,
            });
        }
    });
    device.addCurrentLevelListener((value) => {
        haMiddleware.callAService(
            'light',
            Number(value) > 0 ? 'turn_on' : 'turn_off',
            { entity_id: haEntity.entity_id, brightness: Number(value) }
        );
    });
    bridge.addDevice(device, {
        nodeLabel: haEntity.attributes['friendly_name'],
        reachable: true,
        serialNumber: serialFromId,
    });

    DEVICE_ENTITY_MAP[haEntity.entity_id] = { haEntity, device };
}

function addimmerableLightDeviceToMap(
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge
): void {
    const device = new DimmableLightDevice();
    const serialFromId = MD5(haEntity.entity_id).toString();
    device.addOnOffListener((value, oldValue) => {
        if (value !== oldValue) {
            haMiddleware.callAService('light', value ? 'turn_on' : 'turn_off', {
                entity_id: haEntity.entity_id,
            });
        }
    });
    device.addCommandHandler(
        'identify',
        async ({ request: { identifyTime } }) =>
            LOGGER.info(
                `Identify called for OnOffDevice ${haEntity.attributes['friendly_name']} with id: ${serialFromId} and identifyTime: ${identifyTime}`
            )
    );

    device.addCurrentLevelListener((value) => {
        haMiddleware.callAService(
            'light',
            Number(value) > 0 ? 'turn_on' : 'turn_off',
            { entity_id: haEntity.entity_id, brightness: Number(value) }
        );
    });
    haMiddleware.subscrieToDevice(
        haEntity.entity_id,
        (data: HassEvent['data']) => {
            device.setOnOff((data.new_state as any).state === 'on');
            device.setCurrentLevel(
                (data.new_state as any)['attributes']['brightness']
            );
        }
    );

    bridge.addDevice(device, {
        nodeLabel: haEntity.attributes['friendly_name'],
        reachable: true,
        serialNumber: serialFromId,
    });

    DEVICE_ENTITY_MAP[haEntity.entity_id] = { haEntity, device };
}

function addOnOffLightDeviceToMap(
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge
) {
    const device = new OnOffLightDevice();
    const serialFromId = MD5(haEntity.entity_id).toString();
    device.addOnOffListener((value, oldValue) => {
        if (value !== oldValue) {
            haMiddleware.callAService('light', value ? 'turn_on' : 'turn_off', {
                entity_id: haEntity.entity_id,
            });
        }
    });
    device.addCommandHandler(
        'identify',
        async ({ request: { identifyTime } }) =>
            LOGGER.info(
                `Identify called for OnOffDevice ${haEntity.attributes['friendly_name']} with id: ${serialFromId} and identifyTime: ${identifyTime}`
            )
    );
    haMiddleware.subscrieToDevice(
        haEntity.entity_id,
        (data: HassEvent['data']) => {
            device.setOnOff((data.new_state as any).state === 'on');
        }
    );
    bridge.addDevice(device, {
        nodeLabel: haEntity.attributes['friendly_name'],
        reachable: true,
        serialNumber: serialFromId,
    });
    DEVICE_ENTITY_MAP[haEntity.entity_id] = { haEntity, device };
}

const lightsMap: Map<
    string,
    (haEntity: HassEntity, haMiddleware: HAMiddleware, bridge: Bridge) => void
> = new Map<
    string,
    (haEntity: HassEntity, haMiddleware: HAMiddleware, bridge: Bridge) => void
>([
    ['onoff', addOnOffLightDeviceToMap],
    ['rgb', addRGBLightDeviceToMap],
    ['brightness', addimmerableLightDeviceToMap],
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
