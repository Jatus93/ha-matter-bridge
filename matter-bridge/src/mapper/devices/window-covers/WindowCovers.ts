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
            LOGGER.debug(
                `Assistant request for device ${haEntity.entity_id}`,
                value,
                oldValue,
            );

            if (value && value != oldValue) {
                await haMiddleware.callAService(
                    'cover',
                    'set_cover_position',
                    {
                        entity_id: haEntity.entity_id,
                        position: value! / 100,
                    },
                );
            }
        },
    );

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            LOGGER.debug(`Event for device ${haEntity.entity_id}`);
            LOGGER.debug(JSON.stringify(event));
            shadeEndpoint.set({
                windowCovering: {
                    currentPositionLiftPercentage: event.data[
                        'new_state'
                    ]?.attributes['current_position'] as number,
                },
            });
        },
    );

    bridge.addEndpoint(shadeEndpoint);
    return shadeEndpoint;
};
