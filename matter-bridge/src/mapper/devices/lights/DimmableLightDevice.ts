import { DimmableLightDevice } from '@project-chip/matter.js/devices/DimmableLightDevice';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import { BridgedDeviceBasicInformationServer } from '@project-chip/matter.js/behavior/definitions/bridged-device-basic-information';

import pkg from 'crypto-js';
const { MD5 } = pkg;
import { HassEntity, StateChangedEvent } from '@ha/HAssTypes.js';
import {
    AddHaDeviceToBridge,
    Bridge,
    HAMiddleware,
    StateQueue,
} from '../MapperType.js';
import { Logger } from '@project-chip/matter-node.js/log';
import { getOnOffFunction } from './OnOffLightDevice.js';

export function getDimFunction(
    logger: Logger,
    entity_id: string,
    stateQueue: StateQueue,
    haMiddleware: HAMiddleware,
) {
    return (value: number | null) => {
        logger.debug(
            `CurrentLevel Event for device ${entity_id} value: ${value}`,
        );
        stateQueue.addFunctionToQueue(async () => {
            let extraArgs = {
                target: { entity_id },
            } as object;
            if (Number(value) > 0) {
                extraArgs = {
                    ...extraArgs,
                    service_data: { brightness: Number(value) },
                };
            }

            try {
                await haMiddleware.callAService(
                    'light',
                    Number(value) > 0 ? 'turn_on' : 'turn_off',
                    extraArgs,
                );
            } catch (error) {
                logger.error(
                    'Could not handle device change:',
                    entity_id,
                    'Error:',
                    error,
                );
            }
        });
    };
}

export const addDimmableLightDevice: AddHaDeviceToBridge = async (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<StateQueue> => {
    const logger = new Logger(`DimmableLight ${haEntity.entity_id}`);

    logger.debug(
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

    const stateQueue = new StateQueue();

    const onOffFunction = getOnOffFunction(
        logger,
        haEntity.entity_id,
        stateQueue,
        haMiddleware,
    );

    endpoint.events.onOff.onOff$Changed.on(onOffFunction);

    const dimmerFunction = getDimFunction(
        logger,
        haEntity.entity_id,
        stateQueue,
        haMiddleware,
    );
    endpoint.events.levelControl.currentLevel$Changed.on(
        dimmerFunction,
    );

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            logger.debug(`Event for device ${haEntity.entity_id}`);
            logger.debug(JSON.stringify(event));
            let newBrightness: number = Number(
                (event.data.new_state?.attributes as never)[
                    'brightness'
                ],
            );
            let oldBrightness: number = Number(
                (event.data.new_state?.attributes as never)[
                    'brightness'
                ],
            );

            newBrightness = newBrightness > 254 ? 254 : newBrightness;
            oldBrightness = oldBrightness > 254 ? 254 : oldBrightness;
            const currentLevel =
                endpoint.state.levelControl.currentLevel;

            stateQueue.addFunctionToQueue(async () => {
                try {
                    if (
                        currentLevel !== newBrightness &&
                        currentLevel !== oldBrightness
                    ) {
                        await endpoint.set({
                            onOff: {
                                onOff:
                                    event.data.new_state?.state ===
                                    'on',
                            },
                            levelControl: {
                                currentLevel: newBrightness,
                            },
                        });
                    }
                } catch (error) {
                    logger.error(
                        'Could not handle device set:',
                        haEntity.entity_id,
                        'Error:',
                        error,
                    );
                }
            });
        },
    );

    await bridge.addEndpoint(endpoint);

    return stateQueue;
};
