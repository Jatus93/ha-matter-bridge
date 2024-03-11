/* eslint-disable @typescript-eslint/no-explicit-any */
import { BridgedDeviceBasicInformationServer } from '@project-chip/matter.js/behavior/definitions/bridged-device-basic-information';
import { OnOffLightDevice } from '@project-chip/matter.js/devices/OnOffLightDevice';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import { MD5 } from 'crypto-js';
import {
    HassEntity,
    StateChangedEvent,
} from '../../../home-assistant/HAssTypes.js';
import {
    AddHaDeviceToBridge,
    Bridge,
    HAMiddleware,
} from '../MapperType.js';
import { Logger } from '@project-chip/matter-node.js/log';

const LOGGER = new Logger('OnOffLight');
export const addOnOffLightDevice: AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Endpoint => {
    LOGGER.debug(
        `Building device ${haEntity.entity_id} \n ${JSON.stringify({
            haEntity,
        })}`,
    );
    const serialFromId = MD5(haEntity.entity_id).toString();

    const endpoint = new Endpoint(
        OnOffLightDevice.with(BridgedDeviceBasicInformationServer),
        {
            id: `ha-light-${serialFromId}`,
            bridgedDeviceBasicInformation: {
                nodeLabel: haEntity.attributes['friendly_name'],
                productName: haEntity.attributes['friendly_name'],
                productLabel: haEntity.attributes['friendly_name'],
                reachable: true,
                serialNumber: serialFromId,
            },
        },
    );
    endpoint.events.onOff.onOff$Change.on((value, oldValue) => {
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

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            LOGGER.debug(`Event for device ${haEntity.entity_id}`);
            LOGGER.debug(JSON.stringify(event));
            endpoint.set({
                onOff: {
                    onOff: event.data.new_state?.state === 'on',
                },
            });
        },
    );
    bridge.addEndpoint(endpoint);
    return endpoint;
};
