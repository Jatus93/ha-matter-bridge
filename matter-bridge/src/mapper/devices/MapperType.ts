import { Endpoint } from '@project-chip/matter.js/endpoint';
import { HassEntity } from '../../home-assistant/HAssTypes.js';

import { HAMiddleware } from '../../home-assistant/HAmiddleware.js';
import { Bridge } from '../../matter/Bridge.js';
import { sleep } from '../../utils/utils.js';
import { Logger } from '@project-chip/matter-node.js/log';

export type AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) => MapperElement;

export { HAMiddleware };
export { Bridge };

const LOGGER = new Logger('MapperElement');

export class MapperElement {
    static readonly DEFAULT_SLEEP = 200;
    protected haEntity: HassEntity;
    protected haMiddleware: HAMiddleware;
    protected bridge: Bridge;
    protected endpoint: Endpoint;
    protected updatePending = false;
    constructor(
        haEntity: HassEntity,
        haMiddleware: HAMiddleware,
        bridge: Bridge,
        endpoint: Endpoint,
    ) {
        this.haEntity = haEntity;
        this.bridge = bridge;
        this.haMiddleware = haMiddleware;
        this.endpoint = endpoint;
    }
    get updating(): boolean {
        return this.updatePending;
    }

    async awaitUpdate(): Promise<void> {
        LOGGER.info('Waiting for the device to be ready');
        while (this.updatePending) {
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
}
