import { BridgedDeviceBasicInformationServer } from '@project-chip/matter.js/behavior/definitions/bridged-device-basic-information';
import { OnOffLightDevice } from '@project-chip/matter.js/devices/OnOffLightDevice';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import { HassEntity, StateChangedEvent } from '@ha/HAssTypes.js';
import {
    AddHaDeviceToBridge,
    Bridge,
    HAMiddleware,
    StateQueue,
} from '../MapperType.js';
import { Logger } from '@project-chip/matter-node.js/log';
import pkg from 'crypto-js';
const { MD5 } = pkg;

export function getOnOffFunction(
    logger: Logger,
    entity_id: string,
    stateQueue: StateQueue,
    haMiddleware: HAMiddleware,
) {
    return (value: boolean, oldValue: boolean): void => {
        logger.debug(
            `OnOff Event for device ${entity_id}, ${JSON.stringify({
                value,
                oldValue,
            })}`,
        );

        if (value !== oldValue) {
            stateQueue.addFunctionToQueue(async () => {
                try {
                    await haMiddleware.callAService(
                        'light',
                        value ? 'turn_on' : 'turn_off',
                        {
                            target: { entity_id: entity_id },
                        },
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
        }
    };
}

export const addOnOffLightDevice: AddHaDeviceToBridge = async (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<StateQueue> => {
    const logger = new Logger(`OnOffLight ${haEntity.entity_id}`);

    logger.debug(
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
            onOff: { onOff: haEntity.state === 'on' },
        },
    );

    const stateQueue = new StateQueue(haEntity);
    const onOffFucntion = getOnOffFunction(
        logger,
        haEntity.entity_id,
        stateQueue,
        haMiddleware,
    );
    endpoint.events.onOff.onOff$Changed.on(onOffFucntion);

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            logger.debug(`Event for device ${haEntity.entity_id}`);
            logger.debug(JSON.stringify(event));
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
