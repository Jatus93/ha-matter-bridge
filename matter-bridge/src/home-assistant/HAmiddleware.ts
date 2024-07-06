import { Logger } from '@project-chip/matter-node.js/log';
import { HassEntity, StateChangedEvent } from './HAssTypes.js';
import hass, { HassApi, HassWsOptions } from 'homeassistant-ws';

export class HAMiddleware {
    private logger = new Logger('HAMiddleware');
    private hassClient: HassApi;
    private static instance: HAMiddleware;
    private entities: { [k: string]: HassEntity } = {};
    private functionsToCallOnChange: {
        [k: string]:
            | ((data: StateChangedEvent) => Promise<void> | void)
            | undefined;
    } = {};

    stop(): void {
        this.hassClient.rawClient.ws.close();
    }

    async callAService(
        domain: string,
        service: string,
        extraArgs?: unknown,
    ) {
        await this.hassClient.callService(domain, service, extraArgs);
    }

    subscribe(): void {
        this.hassClient.on('state_changed', (event) => {
            this.logger.debug(JSON.stringify(event));
            const toDo =
                this.functionsToCallOnChange[event.data.entity_id];
            if (toDo) {
                toDo(event)
                    ?.then(this.logger.info)
                    ?.catch(this.logger.error);
            }
        });
    }

    subscribeToDevice(
        deviceId: string,
        fn: (event: StateChangedEvent) => Promise<void> | void,
    ) {
        this.functionsToCallOnChange[deviceId] = fn;
        this.logger.debug(this.functionsToCallOnChange);
    }

    async getStates(): Promise<{ [k: string]: HassEntity }> {
        const states = await this.hassClient.getStates();
        const sorted = states.reduceRight<{
            [k: string]: HassEntity;
        }>((last, current) => {
            last[current['entity_id']] = current;
            return last;
        }, {});
        this.logger.debug(JSON.stringify({ getStates: sorted }));
        this.entities = sorted;
        return this.entities;
    }

    async getStatesPartitionedByType(): Promise<{
        [k: string]: HassEntity[];
    }> {
        const states = await this.getStates();
        const toReturn = Object.keys(states).reduceRight<{
            [k: string]: HassEntity[];
        }>((prev, current) => {
            const key = current.split('.')[0];
            if (!prev[key] && !Array.isArray(prev[key])) {
                prev[key] = new Array<HassEntity>();
            }
            prev[key].push(states[current]);
            return prev;
        }, {});
        this.logger.debug(
            JSON.stringify({ getStatesPartitionedByType: toReturn }),
        );
        return toReturn;
    }

    async getServices() {
        const states = await this.hassClient.getServices();
        return states as object;
    }

    private constructor(client: HassApi) {
        this.hassClient = client;
    }

    public static async getInstance(
        callerOptions?: Partial<HassWsOptions> | undefined,
    ): Promise<HAMiddleware> {
        if (!HAMiddleware.instance) {
            const client = await hass.default(callerOptions);
            HAMiddleware.instance = new HAMiddleware(client);
        }
        return HAMiddleware.instance;
    }
}
