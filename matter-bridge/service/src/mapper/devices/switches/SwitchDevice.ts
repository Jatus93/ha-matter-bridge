import '@project-chip/matter-node.js';
import { OnOffPlugInUnitDevice } from '@project-chip/matter.js/devices/OnOffPlugInUnitDevice';
import { BridgedDeviceBasicInformationServer } from '@project-chip/matter.js/behavior/definitions/bridged-device-basic-information';
import { ScenesBehavior } from '@project-chip/matter.js/behavior/definitions/scenes';
import { HassEntity, StateChangedEvent } from '@ha/HAssTypes.js';

import {
    AddHaDeviceToBridge,
    Bridge,
    HAMiddleware,
    StateQueue,
} from '../MapperType.js';
import { Logger } from '@project-chip/matter-node.js/log';
import { Endpoint } from '@project-chip/matter.js/endpoint';

import pkg from 'crypto-js';
const { MD5 } = pkg;

export const getSwitchDeviceQueue: AddHaDeviceToBridge = async (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<StateQueue> => {
    const logger = new Logger(`SocketDevice ${haEntity.entity_id}`);
    const serialFromId = MD5(haEntity.entity_id).toString();
    let endpointType = OnOffPlugInUnitDevice.with(
        BridgedDeviceBasicInformationServer,
    );
    if (haEntity.entity_id.split('.')[0] === 'scene') {
        endpointType = OnOffPlugInUnitDevice.with(
            BridgedDeviceBasicInformationServer,
            ScenesBehavior,
        );
    }
    const endpoint = new Endpoint(endpointType, {
        id: `switch-${serialFromId}`,
        bridgedDeviceBasicInformation: {
            nodeLabel: haEntity.attributes['friendly_name']?.slice(
                0,
                31,
            ),
            productName: haEntity.attributes['friendly_name']?.slice(
                0,
                31,
            ),
            productLabel: haEntity.attributes['friendly_name']?.slice(
                0,
                31,
            ),
            reachable: true,
            serialNumber: serialFromId,
        },
    });

    const stateQueue = new StateQueue();

    endpoint.events.onOff.onOff$Changed.on((value, oldValue) => {
        logger.debug(
            `OnOff Event for device ${haEntity.entity_id}, ${JSON.stringify(
                {
                    value,
                    oldValue,
                },
            )}`,
        );

        if (value !== oldValue) {
            stateQueue.addFunctionToQueue(async () => {
                try {
                    await haMiddleware.callAService(
                        'switch',
                        value ? 'turn_on' : 'turn_off',
                        {
                            target: { entity_id: haEntity.entity_id },
                        },
                    );
                } catch (error) {
                    logger.error(
                        'Could not handle device change:',
                        haEntity.entity_id,
                        'Error:',
                        error,
                    );
                }
            });
        }
    });

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            logger.debug(`Event for device ${haEntity.entity_id}`);
            logger.debug(JSON.stringify(event));
            stateQueue.addFunctionToQueue(async () => {
                await endpoint.set({
                    bridgedDeviceBasicInformation: {
                        reachable:
                            event.data.new_state?.state ===
                            'unavailable',
                    },
                });
            });
            stateQueue.addFunctionToQueue(async () => {
                try {
                    await endpoint.set({
                        onOff: {
                            onOff:
                                event.data.new_state?.state === 'on',
                        },
                    });
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
