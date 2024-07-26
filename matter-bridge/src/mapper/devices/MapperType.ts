// import { Endpoint } from '@project-chip/matter.js/endpoint';
import { HassEntity, StateChangedEvent } from '@ha/HAssTypes.js';
import { EventEmitter } from 'events';

import { HAMiddleware } from '@ha/HAmiddleware.js';
import { Bridge } from '@matter/Bridge.js';
import { sleep } from '@utils/utils.js';
import { Logger } from '@project-chip/matter-node.js/log';

export type AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) => Promise<StateQueue>;

export { HAMiddleware };
export { Bridge };

const LOGGER = new Logger('MapperElement');

export class StateQueue extends EventEmitter {
    static readonly DEFAULT_SLEEP = 10;
    protected updatePending = false;
    protected dequeuing = false;
    protected lastEntityState: HassEntity;
    protected haMiddleware: HAMiddleware;
    protected logger: Logger;
    protected nextEntityState: HassEntity;

    private queue: (() => Promise<void>)[] = [];

    constructor(
        haEntity: HassEntity,
        haMiddleware: HAMiddleware,
        logger: Logger,
    ) {
        super();
        this.lastEntityState = haEntity;
        this.nextEntityState = haEntity;
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

    updateState(haEntity: HassEntity): void {
        if (this.lastEntityState.state !== haEntity.state) {
            this.emit(
                `stateChange-${this.lastEntityState.entity_id}`,
                haEntity.state,
            );
        }
        if (
            JSON.stringify(this.lastEntityState.attributes) !==
            JSON.stringify(haEntity.attributes)
        ) {
            this.emit(
                `attributesChange-${this.lastEntityState.entity_id}`,
                haEntity.attributes,
            );
        }
        this.nextEntityState = haEntity;
    }
}
