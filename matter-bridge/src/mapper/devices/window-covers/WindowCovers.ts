import {
    MovementDirection,
    MovementType,
    WindowCoveringServer,
} from '@project-chip/matter.js/behavior/definitions/window-covering';
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
    StateQueue,
} from '../MapperType.js';
import { Logger } from '@project-chip/matter-node.js/log';
import pkg from 'crypto-js';
const { MD5 } = pkg;

const LOGGER = new Logger('WindowCover');

export const addWindowCover: AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): StateQueue => {
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

    const stateQueue = new StateQueue();

    class CustomWindowCoveringServer extends LiftingWindowCoveringServer {
        handleMovement(
            type: MovementType,
            reversed: boolean,
            direction: MovementDirection,
            targetPercent100ths?: number,
        ): Promise<void> {
            if (targetPercent100ths) {
                return new Promise((resolve, rejects) => {
                    stateQueue.addFunctionToQueue(async () => {
                        try {
                            await haMiddleware.callAService(
                                'cover',
                                'set_cover_position',
                                {
                                    entity_id: haEntity.entity_id,
                                    position:
                                        targetPercent100ths / 100,
                                },
                            );
                        } catch (error) {
                            return rejects(error);
                        }
                        resolve();
                    });
                });
            }
            if (direction === MovementDirection.Open) {
                return new Promise((resolve, rejects) => {
                    stateQueue.addFunctionToQueue(async () => {
                        try {
                            await haMiddleware.callAService(
                                'cover',
                                'set_cover_position',
                                {
                                    entity_id: haEntity.entity_id,
                                    position: 100,
                                },
                            );
                        } catch (error) {
                            return rejects(error);
                        }
                        resolve();
                    });
                });
            }
            if (direction === MovementDirection.Close) {
                return new Promise((resolve, rejects) => {
                    stateQueue.addFunctionToQueue(async () => {
                        try {
                            await haMiddleware.callAService(
                                'cover',
                                'set_cover_position',
                                {
                                    entity_id: haEntity.entity_id,
                                    position: 0,
                                },
                            );
                        } catch (error) {
                            return rejects(error);
                        }
                        resolve();
                    });
                });
            }
            return new Promise((resolve) => {
                resolve();
            });
        }
    }

    const shadeEndpoint = new Endpoint(
        WindowCoveringDevice.with(CustomWindowCoveringServer),
        {
            id: `ha-window-cover-${serialFromId}`,
            windowCovering: {
                currentPositionLiftPercent100ths: haEntity.attributes[
                    'current_position'
                ] as number,
                configStatus: { liftPositionAware: true },
            },
        },
    );

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            console.debug(`Event for device ${haEntity.entity_id}`);
            console.debug(JSON.stringify(event));
            stateQueue.addFunctionToQueue(async () => {
                try {
                    await shadeEndpoint.set({
                        windowCovering: {
                            currentPositionLiftPercentage: event.data[
                                'new_state'
                            ]?.attributes[
                                'current_position'
                            ] as number,
                        },
                    });
                    LOGGER.debug(shadeEndpoint.state.windowCovering);
                } catch (error) {
                    LOGGER.error(
                        'Could not handle device set: ',
                        haEntity.entity_id,
                        'Error:',
                        error,
                    );
                }
            });
        },
    );

    bridge.addEndpoint(shadeEndpoint);
    return stateQueue;
};
