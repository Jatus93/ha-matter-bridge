import { Logger } from '@project-chip/matter-node.js/log';
import {
    HAmiddlewareConfig,
    HassEntity,
    StateChangedEvent,
    MessageBase,
    BaseResponse,
    Event as HAEvent,
    HassEntityLocal,
} from './HAssTypes.js';

import { WebSocket, RawData } from 'ws';
import { TextDecoder } from 'util';

import fs from 'fs/promises';
import { existsSync, mkdirSync, watchFile } from 'fs';
import path from 'path';

export class HAMiddleware {
    private lastMessageNumber = 1;
    private static decoder = new TextDecoder();
    private ws: WebSocket;
    private logger = new Logger('HAMiddleware');
    private static instance: HAMiddleware;
    private entities: { [k: string]: HassEntity } = {};
    private localConfiguredEntities: {
        [k: string]: HassEntityLocal;
    } = {};
    private functionsToCallOnChange: {
        [k: string]:
            | ((data: StateChangedEvent) => Promise<void> | void)
            | undefined;
    } = {};

    stop(): void {
        this.ws.close();
    }

    async callAService(
        domain: string,
        service: string,
        extraArgs?: object,
    ): Promise<void> {
        const expectedReponseNumber = this.lastMessageNumber++;
        const message: MessageBase = {
            id: expectedReponseNumber,
            type: 'call_service',
            domain,
            service,
            ...extraArgs,
        };
        const response = await this.requestHandler(message);
        if (!response.success) {
            throw new Error(
                'Service call errored with this response:'.concat(
                    JSON.stringify({ response }, null, 4),
                ),
            );
        }
    }

    requestHandler(message: MessageBase): Promise<BaseResponse> {
        this.logger.debug(
            'requestHandler',
            JSON.stringify({ message }, null, 4),
        );
        return new Promise((resolve, reject) => {
            if (!this.ws.OPEN) {
                return reject(
                    'The communication weboscket is not ready',
                );
            }
            const responseHandler = (data: RawData) => {
                const decoded = JSON.parse(
                    HAMiddleware.decoder.decode(data as Buffer),
                ) as BaseResponse;
                // this.logger.debug('requestHandler', decoded);
                if (decoded.id === message.id) {
                    this.ws.off('message', responseHandler);
                    return resolve(decoded);
                }
            };
            this.ws.send(JSON.stringify(message));
            this.ws.on('message', responseHandler);
        });
    }

    async subscribe(): Promise<void> {
        const message: MessageBase = {
            id: this.lastMessageNumber++,
            type: 'subscribe_events',
            event_type: 'state_changed',
        };
        const serviceResponse = await this.requestHandler(message);
        if (!serviceResponse.success) {
            throw new Error(
                'Could not subscribe to the HomeAssistant event bus: '.concat(
                    JSON.stringify({ serviceResponse }),
                ),
            );
        }
        this.ws.on('message', (data: RawData) => {
            const parsed = JSON.parse(
                HAMiddleware.decoder.decode(data as Buffer),
            ) as HAEvent;
            if (parsed.id === message.id && parsed.type === 'event') {
                const toDo =
                    this.functionsToCallOnChange[
                        parsed.event.data.entity_id
                    ];
                if (toDo) {
                    toDo(parsed.event)
                        ?.then(this.logger.info)
                        ?.catch(this.logger.error);
                }
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
        const message: MessageBase = {
            id: this.lastMessageNumber++,
            type: 'get_states',
        };
        this.logger.info('GetStates()', { message });
        const serviceResponse = await this.requestHandler(message);
        this.logger.info('GetStates()', { serviceResponse });
        const states = serviceResponse.result as HassEntity[];
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

    async getStatesPartitionedByType(filtered = false): Promise<{
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
            const currentEntity = states[current];
            if (
                filtered &&
                this.localConfiguredEntities[currentEntity.entity_id]
                    ?.visible
            ) {
                prev[key].push(states[current]);
                this.logger.debug(
                    'added ',
                    states[current]['entity_id'],
                );
            }
            return prev;
        }, {});
        this.logger.debug(
            JSON.stringify({ getStatesPartitionedByType: toReturn }),
        );
        return toReturn;
    }

    private async loadLocalDevices(
        pathConfig = 'config/confDevices.json',
    ) {
        if (!existsSync(path.dirname(pathConfig))) {
            mkdirSync(path.dirname(pathConfig));
        }
        const fileExtist = existsSync(pathConfig);
        this.localConfiguredEntities = JSON.parse(
            (
                await fs.readFile(
                    pathConfig,
                    fileExtist
                        ? undefined
                        : {
                              flag: 'w+',
                          },
                )
            ).toString() || '{}',
        ) as unknown as { [key: string]: HassEntityLocal };
    }

    private pruneLocalDevices(states: {
        [key: string]: HassEntity;
    }): void {
        const localPrunedEntities: { [k: string]: HassEntityLocal } =
            {};
        const stateKeys: string[] = Object.keys(states);
        const localKeys: string[] = Object.keys(
            this.localConfiguredEntities,
        );
        this.logger.debug(
            'Prune function',
            localKeys.length,
            stateKeys.length,
        );
        for (const key of localKeys) {
            if (!(key in stateKeys)) {
                localPrunedEntities[key] =
                    this.localConfiguredEntities[key];
            }
        }
        this.localConfiguredEntities = localPrunedEntities;
    }

    public async updateLocalDevices(
        pathConfig = 'config/confDevices.json',
    ): Promise<void> {
        await this.loadLocalDevices(pathConfig);
        const states = await this.getStates();
        for (const id of Object.keys(states)) {
            if (!this.localConfiguredEntities[id]) {
                this.localConfiguredEntities[id] = {
                    id,
                    custom_name:
                        states[id].attributes['friendly_name'] || id,
                    visible: false,
                };
            }
        }
        this.pruneLocalDevices(states);
        fs.writeFile(
            pathConfig,
            JSON.stringify(this.localConfiguredEntities),
        );
        watchFile(pathConfig, { persistent: true }, async () => {
            this.logger.info('Updated confDevices file, updating');
            await this.loadLocalDevices(pathConfig);
        });
    }

    async getServices() {
        const message: MessageBase = {
            id: this.lastMessageNumber++,
            type: 'get_services',
        };
        const serviceResponse = await this.requestHandler(message);
        return serviceResponse.result;
    }

    private constructor(client: WebSocket) {
        this.ws = client;
    }

    public static async getInstance(
        config: HAmiddlewareConfig,
    ): Promise<HAMiddleware> {
        if (!HAMiddleware.instance) {
            const ws = await this.getWebSocket(config);
            HAMiddleware.instance = new HAMiddleware(ws);
        }
        return HAMiddleware.instance;
    }

    private static getWebSocket(
        config: HAmiddlewareConfig,
    ): Promise<WebSocket> {
        const ws = new WebSocket(
            `ws://${config.host}:${config.port}${config.path}`,
        );
        console.log('Init websocket');
        const sendAuth = () => {
            console.log('Sendig websocket auth payload');
            ws.send(
                JSON.stringify({
                    type: 'auth',
                    access_token: config.token,
                }),
            );
        };
        return new Promise((resolve, rejects) => {
            console.log('Reading websocket message');
            const credentialSender = (data: RawData) => {
                const obj = JSON.parse(
                    this.decoder.decode(data as Buffer),
                );
                console.log(obj);
                if (obj['type'] === 'auth_ok') {
                    console.log(obj);
                    ws.off('message', credentialSender);
                    return resolve(ws);
                } else if (obj['type'] === 'auth_required') {
                    sendAuth();
                } else {
                    return rejects(obj);
                }
            };
            ws.on('message', credentialSender);
        });
    }
}
