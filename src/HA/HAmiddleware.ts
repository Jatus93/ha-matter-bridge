import { Logger } from '@project-chip/matter-node.js/log';
import { HassEntity, StateChangedEvent } from './HAssTypes';
import hass, { HassApi, HassWsOptions } from 'homeassistant-ws';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HAMiddleware {
    private logger = new Logger('HAMiddleware');
    private hassClient: HassApi;
    private static instance: HAMiddleware;
    private connectionOpen: boolean = false;
    private requestFulfilled: boolean = true;
    private entities: { [k: string]: HassEntity } = {};
    private functionsToCallOnChange: {
        [k: string]: ((data: StateChangedEvent) => void) | undefined;
    } = {};

    async waitCompletition(): Promise<void> {
        let waited = 0;
        const timeOut = 5000;
        while (!this.requestFulfilled && waited < timeOut) {
            await sleep(1000);
            waited += 1000;
        }
    }

    stop(): void {
        this.hassClient.rawClient.ws.close();
    }

    async callAService(domain: string, service: string, extraArgs?: unknown) {
        this.requestFulfilled = false;
        this.hassClient.callService(domain, service, extraArgs);
    }

    subscribe() {
        this.hassClient.on('state_changed', (event) => {
            this.logger.debug(event);
            const toDo =
                this.functionsToCallOnChange[event.data.entity_id];
            if (toDo) {
                toDo(event.data);
            }
        });
    }

    subscrieToDevice(deviceId: string, fn: (event: StateChangedEvent) => void) {
        this.functionsToCallOnChange[deviceId] = fn;
        this.logger.debug(this.functionsToCallOnChange);
    }

    async getStates(): Promise<{ [k: string]: HassEntity }> {
        this.requestFulfilled = false;
        const states = await this.hassClient.getStates();
        const sorted = states.reduceRight<{ [k: string]: HassEntity }>(
            (last, current) => {
                last[current['entity_id']] = current;
                return last;
            },
            {}
        );
        this.logger.debug({ getStates: sorted });
        this.entities = sorted;
        return this.entities;
    }

    async getStatesPartitionedByType(): Promise<{ [k: string]: HassEntity[] }> {
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
        this.logger.debug({ getStatesPartitionedByType: toReturn });
        return toReturn;
    }

    async getServices() {
        this.requestFulfilled = false;
        const states = await this.hassClient.getServices();

        return states;
    }

    private constructor(client: HassApi) {
        this.hassClient = client;
    }

    public static async getInstance(
        callerOptions?: Partial<HassWsOptions> | undefined
    ): Promise<HAMiddleware> {
        if (!HAMiddleware.instance) {
            const client = await hass(callerOptions);
            HAMiddleware.instance = new HAMiddleware(client);
            let waited = 0;
            const timeOut = 5000;
            while (!HAMiddleware.instance.connectionOpen && waited < timeOut) {
                await sleep(1000);
                waited += 1000;
            }
        }
        return HAMiddleware.instance;
    }
}
