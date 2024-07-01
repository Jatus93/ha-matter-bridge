import { DimmableLightDevice } from '@project-chip/matter.js/devices/DimmableLightDevice';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import { BridgedDeviceBasicInformationServer } from '@project-chip/matter.js/behavior/definitions/bridged-device-basic-information';

import pkg from 'crypto-js';
const { MD5 } = pkg;
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

const LOGGER = new Logger('DimmableLight');

export const addDimmableLightDevice: AddHaDeviceToBridge = (
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
        DimmableLightDevice.with(BridgedDeviceBasicInformationServer),
        {
            id: `ha-dimmable-light-${serialFromId}`,
            bridgedDeviceBasicInformation: {
                nodeLabel: haEntity.attributes['friendly_name'],
                productName: haEntity.attributes['friendly_name'],
                productLabel: haEntity.attributes['friendly_name'],
                reachable: true,
                serialNumber: serialFromId,
            },
        },
    );
    const dimmableLightMapperElement = new MapperElement(
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
                await dimmableLightMapperElement.execWhenReady(
                    async () => {
                        await haMiddleware.callAService(
                            'light',
                            value ? 'turn_on' : 'turn_off',
                            {
                                entity_id: haEntity.entity_id,
                            },
                        );
                    },
                );
            }
        },
    );

    endpoint.events.levelControl.currentLevel$Changed.on(
        async (value) => {
            LOGGER.debug(
                `CurrentLevel Event for device ${haEntity.entity_id} value: ${value}`,
            );
            let extraArgs = {
                entity_id: haEntity.entity_id,
            } as object;
            if (Number(value) > 0) {
                extraArgs = {
                    ...extraArgs,
                    brightness: Number(value),
                };
            }
            await dimmableLightMapperElement.execWhenReady(
                async () => {
                    await haMiddleware.callAService(
                        'light',
                        Number(value) > 0 ? 'turn_on' : 'turn_off',
                        extraArgs,
                    );
                },
            );
        },
    );

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        async (event: StateChangedEvent) => {
            LOGGER.debug(`Event for device ${haEntity.entity_id}`);
            LOGGER.debug(JSON.stringify(event));
            let brightness: number = Number(
                (event.data.new_state?.attributes as never)[
                    'brightness'
                ],
            );
            brightness = brightness > 254 ? 254 : brightness;
            await dimmableLightMapperElement.execWhenReady(
                async () => {
                    await endpoint.set({
                        onOff: {
                            onOff:
                                event.data.new_state?.state === 'on',
                        },
                        levelControl: {
                            currentLevel: brightness,
                        },
                    });
                },
            );
        },
    );

    bridge.addEndpoint(endpoint);

    return dimmableLightMapperElement;
};
