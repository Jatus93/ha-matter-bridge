import {
    Device,
    DimmableLightDevice,
} from '@project-chip/matter-node.js/device';
import { MD5 } from 'crypto-js';
import {
    HassEntity,
    StateChangedEvent,
} from '../../../home-assistant/HAssTypes';
import { AddHaDeviceToBridge, Bridge, HAMiddleware } from '../MapperType';
import { Logger } from '@project-chip/matter-node.js/log';

const LOGGER = new Logger('DimmableLight');
export const addDimmerableLightDevice: AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge
): Device => {
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
        (event: StateChangedEvent) => {
            device.setOnOff(event.data.new_state?.state === 'on');
            device.setCurrentLevel(
                (event.data.new_state?.attributes as never)['brightness']
            );
        }
    );

    bridge.addDevice(device, {
        nodeLabel: haEntity.attributes['friendly_name'],
        reachable: true,
        serialNumber: serialFromId,
    });
    return device;
};
