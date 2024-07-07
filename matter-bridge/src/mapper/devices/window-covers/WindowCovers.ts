import {
    MovementDirection,
    MovementType,
    WindowCoveringServer,
} from '@project-chip/matter.js/behavior/definitions/window-covering';
import { WindowCoveringDevice } from '@project-chip/matter.js/devices/WindowCoveringDevice';
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
import { MaybePromise } from '@project-chip/matter-node.js/util';
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
        private directionMap: {
            [k in MovementDirection]: Promise<void>;
        } = {
            [MovementDirection.Open]: new Promise(
                (resolve, rejects) => {
                    stateQueue.addFunctionToQueue(async () => {
                        try {
                            await haMiddleware.callAService(
                                'cover',
                                'open_cover',
                                {
                                    target: {
                                        entity_id: haEntity.entity_id,
                                    },
                                },
                            );
                        } catch (error) {
                            return rejects(error);
                        }
                        resolve();
                    });
                },
            ),
            [MovementDirection.Close]: new Promise(
                (resolve, rejects) => {
                    stateQueue.addFunctionToQueue(async () => {
                        try {
                            await haMiddleware.callAService(
                                'cover',
                                'close_cover',
                                {
                                    target: {
                                        entity_id: haEntity.entity_id,
                                    },
                                },
                            );
                        } catch (error) {
                            return rejects(error);
                        }
                        resolve();
                    });
                },
            ),
            [MovementDirection.DefinedByPosition]: new Promise(
                (resolve) => {
                    LOGGER.info('Called Direction by position');
                    return resolve();
                },
            ),
        };
        stopMotion(): MaybePromise {
            return new Promise((resolve, rejects) => {
                stateQueue.addFunctionToQueue(async () => {
                    try {
                        await haMiddleware.callAService(
                            'cover',
                            'stop_cover',
                            {
                                target: {
                                    entity_id: haEntity.entity_id,
                                },
                            },
                        );
                    } catch (error) {
                        return rejects(error);
                    }
                    resolve();
                });
            });
        }

        upOrOpen(): MaybePromise {
            return this.directionMap[MovementDirection.Open];
        }

        downOrClose(): MaybePromise {
            return this.directionMap[MovementDirection.Close];
        }

        handleMovement(
            type: MovementType,
            reversed: boolean,
            direction: MovementDirection,
            targetPercent100ths?: number,
        ): Promise<void> {
            console.log({
                handleMovement: {
                    type,
                    reversed,
                    direction,
                    targetPercent100ths,
                },
            });
            if (
                targetPercent100ths &&
                this.state.currentPositionLiftPercent100ths !==
                    targetPercent100ths
            ) {
                return new Promise((resolve, rejects) => {
                    stateQueue.addFunctionToQueue(async () => {
                        try {
                            await haMiddleware.callAService(
                                'cover',
                                'set_cover_position',
                                {
                                    service_data: {
                                        position:
                                            targetPercent100ths / 100,
                                    },
                                    target: {
                                        entity_id: haEntity.entity_id,
                                    },
                                },
                            );
                        } catch (error) {
                            return rejects(error);
                        }
                        resolve();
                    });
                });
            }
            return this.directionMap[direction];
        }
    }

    const shadeEndpoint = new Endpoint(
        WindowCoveringDevice.with(CustomWindowCoveringServer),
        {
            id: `ha-window-cover-${serialFromId}`,
            windowCovering: {
                configStatus: {
                    liftMovementReversed: true,
                },
                currentPositionLiftPercentage: Number(
                    haEntity.attributes['current_position'],
                ),
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
