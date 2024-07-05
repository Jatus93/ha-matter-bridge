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
    MapperElement,
} from '../MapperType.js';
import { Logger } from '@project-chip/matter-node.js/log';
import pkg from 'crypto-js';
import { sleep } from '../../../utils/utils.js';
const { MD5 } = pkg;

const LOGGER = new Logger('WindowCover');

export const addWindowCover: AddHaDeviceToBridge = (
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

    const LiftingWindowCoveringServer = WindowCoveringServer.with(
        'Lift',
        'AbsolutePosition',
        'PositionAwareLift',
    );

    class CustomWindowCoveringServer extends LiftingWindowCoveringServer {
        static readonly DEFAULT_SLEEP = 10;
        updatePending = false;

        async awaitUpdate(): Promise<void> {
            while (this.updatePending) {
                LOGGER.info('Waiting for the device to be ready');
                await sleep(MapperElement.DEFAULT_SLEEP);
            }
            LOGGER.info('Device ready');
        }

        setUpdating(pending: boolean): void {
            this.updatePending = pending;
        }

        async execWhenReady(fn: () => Promise<void>): Promise<void> {
            await this.awaitUpdate();
            this.setUpdating(true);
            await fn();
            this.setUpdating(false);
        }

        override async upOrOpen(): Promise<void> {
            LOGGER.info('Up or open invoked');
            await this.execWhenReady(async () => {
                await haMiddleware.callAService(
                    'cover',
                    'set_cover_position',
                    {
                        entity_id: haEntity.entity_id,
                        position: 100,
                    },
                );
            });
        }
        override async downOrClose(): Promise<void> {
            LOGGER.info('Down or close invoked');
            await this.execWhenReady(async () => {
                await haMiddleware.callAService(
                    'cover',
                    'set_cover_position',
                    {
                        entity_id: haEntity.entity_id,
                        position: 0,
                    },
                );
            });
        }
    }

    const shadeEndpoint = new Endpoint(
        WindowCoveringDevice.with(CustomWindowCoveringServer),
        {
            id: `ha-window-cover-${serialFromId}`,
        },
    );

    const mapperObject = new MapperElement(
        haEntity,
        haMiddleware,
        bridge,
        shadeEndpoint,
    );

    shadeEndpoint.events.windowCovering.currentPositionLiftPercent100ths$Changed.on(
        async (value, oldValue) => {
            console.debug(
                `Assistant request for device ${haEntity.entity_id}`,
                value,
                oldValue,
            );
            if (value && value != oldValue) {
                await mapperObject.execWhenReady(async () => {
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
                });
            }
        },
    );

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        async (event: StateChangedEvent) => {
            console.debug(`Event for device ${haEntity.entity_id}`);
            console.debug(JSON.stringify(event));
            await mapperObject.execWhenReady(async () => {
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
    return mapperObject;
};
