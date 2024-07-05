import { BridgedDeviceBasicInformationServer } from '@project-chip/matter.js/behavior/definitions/bridged-device-basic-information';
import { OnOffLightDevice } from '@project-chip/matter.js/devices/OnOffLightDevice';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import {
    HassEntity,
    StateChangedEvent,
} from '../../../home-assistant/HAssTypes.js';
import {
    AddHaDeviceToBridge,
    Bridge,
    HAMiddleware,
    MapperElement,
} from '../MapperType.js';
import { Logger } from '@project-chip/matter-node.js/log';
import pkg from 'crypto-js';
const { MD5 } = pkg;

const LOGGER = new Logger('OnOffLight');

export const addOnOffLightDevice: AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): MapperElement => {
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

    const mapperObject = new MapperElement(
        haEntity,
        haMiddleware,
        bridge,
        endpoint,
    );

    endpoint.events.onOff.onOff$Changed.on(
        async (value, oldValue) => {
            LOGGER.debug(
                `OnOff Event for device ${haEntity.entity_id}, ${JSON.stringify(
                    {
                        value,
                        oldValue,
                    },
                )}`,
            );

            if (value !== oldValue) {
                try {
                    await haMiddleware.callAService(
                        'light',
                        value ? 'turn_on' : 'turn_off',
                        {
                            entity_id: haEntity.entity_id,
                        },
                    );
                } catch (error) {
                    LOGGER.error(
                        'Could not handle device change:',
                        haEntity.entity_id,
                        'Error:',
                        error,
                    );
                }
            }
        },
    );

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        async (event: StateChangedEvent) => {
            LOGGER.debug(`Event for device ${haEntity.entity_id}`);
            LOGGER.debug(JSON.stringify(event));
            try {
                await endpoint.set({
                    onOff: {
                        onOff: event.data.new_state?.state === 'on',
                    },
                });
            } catch (error) {
                LOGGER.error(
                    'Could not handle device set:',
                    haEntity.entity_id,
                    'Error:',
                    error,
                );
            }
        },
    );
    bridge.addEndpoint(endpoint);
    return mapperObject;
};
