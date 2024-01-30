/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Device,
    OnOffLightDevice,
} from '@project-chip/matter-node.js/device';
import { MD5 } from 'crypto-js';
import {
    HassEntity,
    StateChangedEvent,
} from '../../../home-assistant/HAssTypes';
import {
    AddHaDeviceToBridge,
    Bridge,
    HAMiddleware,
} from '../MapperType';
import { Logger } from '@project-chip/matter-node.js/log';

const LOGGER = new Logger('OnOffLight');
export const addOnOffLightDevice: AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Device => {
    LOGGER.debug(
        `Building device ${haEntity.entity_id} \n ${JSON.stringify({
            haEntity,
        })}`,
    );
    const device = new OnOffLightDevice();
    const serialFromId = MD5(haEntity.entity_id).toString();
    device.addOnOffListener((value, oldValue) => {
        LOGGER.debug(
            `OnOff Event for device ${haEntity.entity_id}, ${JSON.stringify(
                {
                    value,
                    oldValue,
                },
            )}`,
        );

        if (value !== oldValue) {
            haMiddleware.callAService(
                'light',
                value ? 'turn_on' : 'turn_off',
                {
                    entity_id: haEntity.entity_id,
                },
            );
        }
    });
    device.addCommandHandler(
        'identify',
        ({ request: { identifyTime } }) =>
            LOGGER.info(
                `Identify called for OnOffDevice ${haEntity.attributes['friendly_name']} with id: ${serialFromId} and identifyTime: ${identifyTime}`,
            ),
    );
    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            LOGGER.debug(`Event for device ${haEntity.entity_id}`);
            LOGGER.debug(JSON.stringify(event));
            device.setOnOff(event.data.new_state?.state === 'on');
        },
    );
    bridge.addDevice(device, {
        nodeLabel: haEntity.attributes['friendly_name'],
        reachable: true,
        serialNumber: serialFromId,
    });
    return device;
};
