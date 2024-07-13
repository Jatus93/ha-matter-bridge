import {
    MovementDirection,
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
    }

    const shadeEndpoint = new Endpoint(
        WindowCoveringDevice.with(CustomWindowCoveringServer),
        {
            id: `ha-window-cover-${serialFromId}`,
        },
    );

    shadeEndpoint.events.windowCovering.currentPositionLiftPercent100ths$Changed.on(
        (value, oldValue) => {
            LOGGER.info(
                'Request changing from: ',
                oldValue,
                'to:',
                value,
            );
            stateQueue.addFunctionToQueue(async () => {
                try {
                    await haMiddleware.callAService(
                        'cover',
                        'set_cover_position',
                        {
                            service_data: {
                                position: value! / 100,
                            },
                            target: {
                                entity_id: haEntity.entity_id,
                            },
                        },
                    );
                } catch (error) {
                    LOGGER.error(
                        'Could not handle chaning status: ',
                        haEntity.entity_id,
                        'Error:',
                        error,
                    );
                }
            });
        },
    );

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            console.debug(`Event for device ${haEntity.entity_id}`);
            const currentPosition =
                event.data['new_state']?.attributes[
                    'current_position'
                ] || undefined;
            if (currentPosition === undefined) {
                return;
            }
            console.debug(JSON.stringify(event));
            const validState =
                event.data.new_state?.state === 'open' ||
                event.data.new_state?.state === 'close';
            const targetPosition =
                (event.data['new_state']?.attributes[
                    'current_position'
                ] as number) * 100;
            if (
                validState &&
                shadeEndpoint.state.windowCovering
                    .currentPositionLiftPercent100ths !==
                    targetPosition
            ) {
                stateQueue.addFunctionToQueue(async () => {
                    try {
                        await shadeEndpoint.set({
                            windowCovering: {
                                currentPositionLiftPercent100ths:
                                    targetPosition,
                            },
                        });
                        LOGGER.debug(
                            shadeEndpoint.state.windowCovering,
                        );
                    } catch (error) {
                        LOGGER.error(
                            'Could not handle device set: ',
                            haEntity.entity_id,
                            'Error:',
                            error,
                        );
                    }
                });
            }
        },
    );

    bridge.addEndpoint(shadeEndpoint);
    return stateQueue;
};
