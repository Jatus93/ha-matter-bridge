import '@project-chip/matter-node.js';
import { WindowCoveringServer } from '@project-chip/matter.js/behavior/definitions/window-covering';
import { WindowCoveringDevice } from '@project-chip/matter.js/devices/WindowCoveringDevice';
import { Endpoint } from '@project-chip/matter.js/endpoint';
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
import pkg from 'crypto-js';
const { MD5 } = pkg;

const LOGGER = new Logger('WindowCover');

export const addWindowCover: AddHaDeviceToBridge = (
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

    const LiftingWindowCoveringServer = WindowCoveringServer.with(
        'Lift',
        'AbsolutePosition',
        'PositionAwareLift',
    );

    const shadeEndpoint = new Endpoint(
        WindowCoveringDevice.with(LiftingWindowCoveringServer),
        {
            id: `ha-window-cover-${serialFromId}`,
        },
    );

    shadeEndpoint.events.windowCovering.currentPositionLiftPercent100ths$Changed.on(
        async (value, oldValue) => {
            console.debug(
                `Assistant request for device ${haEntity.entity_id}`,
                value,
                oldValue,
            );
            if (value && value != oldValue) {
                try {
                    await haMiddleware.callAService(
                        'cover',
                        'set_cover_position',
                        {
                            entity_id: haEntity.entity_id,
                            position: value! / 100,
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
            console.debug(`Event for device ${haEntity.entity_id}`);
            console.debug(JSON.stringify(event));
            try {
                await shadeEndpoint.set({
                    windowCovering: {
                        currentPositionLiftPercentage:
                            (event.data['new_state']?.attributes[
                                'current_position'
                            ] as number) * 100,
                    },
                });
            } catch (error) {
                LOGGER.error(
                    'Could not handle device set: ',
                    haEntity.entity_id,
                    'Error:',
                    error,
                );
            }
        },
    );

    bridge.addEndpoint(shadeEndpoint);
    return shadeEndpoint;
};
