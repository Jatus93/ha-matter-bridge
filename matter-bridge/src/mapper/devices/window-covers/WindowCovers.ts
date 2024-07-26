import {
    GoToLiftPercentageRequest,
    WindowCoveringServer,
} from '@project-chip/matter.js/behavior/definitions/window-covering';
import { WindowCoveringDevice } from '@project-chip/matter.js/devices/WindowCoveringDevice';
// import { WindowCovering } from '@project-chip/matter.js/cluster';
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

export const addWindowCover: AddHaDeviceToBridge = async (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<StateQueue> => {
    const logger = new Logger(`WindowCover ${haEntity.entity_id}`);

    logger.debug(
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

    const stateQueue = new StateQueue(haEntity, haMiddleware, logger);

    class CustomWindowCoveringServer extends LiftingWindowCoveringServer {
        logger = new Logger(haEntity.entity_id.toUpperCase());

        override async goToLiftPercentage(
            request: GoToLiftPercentageRequest,
        ): Promise<void> {
            this.logger.info(
                'goToLiftPercentage',
                JSON.stringify(
                    {
                        request,
                    },
                    null,
                    4,
                ),
            );
            stateQueue.addFunctionToQueue(async () => {
                try {
                    await haMiddleware.callAService(
                        'cover',
                        'set_cover_position',
                        {
                            service_data: {
                                position:
                                    100 -
                                    Number(
                                        request.liftPercent100thsValue,
                                    ) /
                                        100,
                            },
                            target: {
                                entity_id: haEntity.entity_id,
                            },
                        },
                    );
                } catch (error) {
                    console.error(error);
                }
            });
            await super.goToLiftPercentage(request);
        }
    }

    const shadeEndpoint = new Endpoint(
        WindowCoveringDevice.with(CustomWindowCoveringServer),
        {
            id: `ha-window-cover-${serialFromId}`,
            windowCovering: {
                configStatus: {
                    operational: true,
                    liftPositionAware: true,
                },
                currentPositionLiftPercent100ths:
                    (100 -
                        Number(
                            haEntity.attributes['current_position'],
                        )) *
                    100,
            },
        },
    );

    stateQueue.on(
        `stateChange-${haEntity.entity_id}`,
        (state: string) => {},
    );

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            logger.info(`Event for device ${haEntity.entity_id}`);
            const currentPosition =
                event.data['new_state']?.attributes[
                    'current_position'
                ] || undefined;
            if (currentPosition === undefined) {
                return;
            }
            logger.debug(JSON.stringify(event));
            const validState =
                event.data.new_state?.state === 'open' ||
                event.data.new_state?.state === 'close';
            const targetPosition =
                (100 -
                    (event.data['new_state']?.attributes[
                        'current_position'
                    ] as number)) *
                100;
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
                        logger.debug(
                            shadeEndpoint.state.windowCovering,
                        );
                    } catch (error) {
                        logger.error(
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

    await bridge.addEndpoint(shadeEndpoint);
    return stateQueue;
};
