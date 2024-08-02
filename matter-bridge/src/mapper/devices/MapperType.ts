// import { Endpoint } from '@project-chip/matter.js/endpoint';
import { HassEntity, StateChangedEvent } from '@ha/HAssTypes.js';
import { EventEmitter } from 'events';

import { HAMiddleware } from '@ha/HAmiddleware.js';
import { Bridge } from '@matter/Bridge.js';
import { sleep } from '@utils/utils.js';
import { Logger } from '@project-chip/matter-node.js/log';
import { Endpoint } from '@project-chip/matter.js/endpoint';

export type AddHaDeviceToBridge<T extends Endpoint> = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) => Promise<T>;

export { HAMiddleware };
export { Bridge };

const LOGGER = new Logger('MapperElement');

export abstract class StateQueue<
    T extends Endpoint,
> extends EventEmitter {
    static readonly DEFAULT_SLEEP = 10;
    protected updatePending = false;
    protected dequeuing = false;
    protected lastEntityState: HassEntity;
    protected haMiddleware: HAMiddleware;
    protected logger: Logger;
    protected nextEntityState: HassEntity;
    protected endpoint: T;

    private queue: (() => Promise<void>)[] = [];

    constructor(
        haEntity: HassEntity,
        haMiddleware: HAMiddleware,
        endpoint: T,
        logger: Logger,
    ) {
        super();
        this.lastEntityState = haEntity;
        this.nextEntityState = haEntity;
        this.endpoint = endpoint;
        this.haMiddleware = haMiddleware;
        this.logger = logger;
        this.on('newStateRequested', this.runUtilEmpty);
        haMiddleware.subscribeToDevice(
            haEntity.entity_id,
            (event: StateChangedEvent) => {
                this.logger.info(
                    `Event for device ${haEntity.entity_id}`,
                );
                if (event.data.new_state) {
                    this.updateState(event.data.new_state);
                }
            },
        );
    }

    protected async runUtilEmpty(): Promise<void> {
        if (this.dequeuing) {
            return;
        }
        this.dequeuing = true;
        while (this.queue.length) {
            const fn = this.queue.shift();
            if (fn) {
                await this.execWhenReady(fn);
            }
        }
        this.dequeuing = false;
    }

    private async awaitUpdate(): Promise<void> {
        LOGGER.info('Waiting for the device to be ready');
        while (this.updatePending) {
            await sleep(StateQueue.DEFAULT_SLEEP);
        }
        LOGGER.info('Device ready');
    }

    private async execWhenReady(
        fn: () => Promise<void>,
    ): Promise<void> {
        await this.awaitUpdate();
        this.updatePending = true;
        await fn();
        this.updatePending = false;
    }

    addFunctionToQueue(fn: () => Promise<void>): void {
        this.queue.push(fn);
        this.emit('newStateRequested');
    }

    abstract stateUpdateFunction(
        stateChanged: boolean,
        attributesChanged: boolean,
        haEntity: HassEntity,
    ): Promise<void>;

    abstract setStateOnlineState(online: boolean): Promise<void>;

    updateState(haEntity: HassEntity): void {
        this.addFunctionToQueue(async () => {
            await this.setStateOnlineState(
                haEntity.state === 'unavailable',
            );
        });

        const stateChanged =
            this.lastEntityState.state !== haEntity.state;

        const attributesChanged =
            JSON.stringify(this.lastEntityState.attributes) !==
            JSON.stringify(haEntity.attributes);

        this.addFunctionToQueue(async () => {
            await this.stateUpdateFunction(
                stateChanged,
                attributesChanged,
                haEntity,
            );
        });
    }
}
