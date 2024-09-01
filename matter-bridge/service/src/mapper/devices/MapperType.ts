// import { Endpoint } from '@project-chip/matter.js/endpoint';
import { HassEntity } from '@ha/HAssTypes.js';
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
    static readonly DEFAULT_SLEEP = 500;
    protected updatePending = false;
    protected dequeuing = false;

    private queue: (() => Promise<void>)[] = [];

    constructor() {
        super();
        this.on('newStateRequested', this.runUtilEmpty);
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
}
