import '@project-chip/matter-node.js';
import { requireMinNodeVersion } from '@project-chip/matter-node.js/util';

import { Endpoint } from '@project-chip/matter.js/endpoint';
import { VendorId } from '@project-chip/matter.js/datatype';
import { ServerNode } from '@project-chip/matter.js/node';
import { AggregatorEndpoint } from '@project-chip/matter.js/endpoints/AggregatorEndpoint';
import {
    Environment,
    StorageService,
} from '@project-chip/matter.js/environment';
import { Time } from '@project-chip/matter-node.js/time';
requireMinNodeVersion(20);

interface LocalConfig {
    uniqueId: string;
    deviceName: string;
    vendorName: string;
    passcode: number;
    discriminator: number;
    vendorId: number;
    productName: string;
    productId: number;
    port: number;
}

export class Bridge {
    private server: ServerNode;
    private aggregator: Endpoint;

    private constructor(server: ServerNode, aggregator: Endpoint) {
        this.server = server;
        this.aggregator = aggregator;
    }

    public static async create(): Promise<Bridge> {
        const config = await Bridge.getConfiguration();
        const server = await Bridge.getServer(config);
        const aggregator = new Endpoint(AggregatorEndpoint, {
            id: 'aggregator',
        });
        await server.add(aggregator);
        const bridge = new Bridge(server, aggregator);
        return bridge;
    }

    public async addEndpoint(endpoint: Endpoint): Promise<void> {
        await this.aggregator.add(endpoint);
    }

    public async start(): Promise<void> {
        await this.server.bringOnline();
    }

    public async stop(): Promise<void> {
        await this.server.close();
    }

    public static async getServer(
        config: LocalConfig,
    ): Promise<ServerNode> {
        const server = await ServerNode.create({
            id: config.uniqueId,
            network: {
                port: config.port,
            },
            productDescription: {
                name: config.deviceName,
                deviceType: AggregatorEndpoint.deviceType,
            },
            commissioning: {
                passcode: config.passcode,
                discriminator: config.discriminator,
            },
            basicInformation: {
                vendorName: config.vendorName,
                vendorId: VendorId(config.vendorId),
                nodeLabel: config.productName,
                productName: config.productName,
                productLabel: config.productName,
                productId: config.productId,
                serialNumber: `matterjs-${config.uniqueId}`,
                uniqueId: config.uniqueId,
            },
        });
        return server;
    }

    private static async getConfiguration(): Promise<LocalConfig> {
        const environment = Environment.default;

        const storageService = environment.get(StorageService);
        console.log(
            `Storage location: ${storageService.location} (Directory)`,
        );
        console.log(
            'Use the parameter "--storage-path=NAME-OR-PATH" to specify a different storage location in this directory, use --storage-clear to start with an empty storage.',
        );
        const deviceStorage = (
            await storageService.open('device')
        ).createContext('data');

        const deviceName = 'Matter test device';
        const vendorName = 'matter-node.js';
        const passcode =
            environment.vars.number('passcode') ??
            (await deviceStorage.get('passcode', 20202021));
        const discriminator =
            environment.vars.number('discriminator') ??
            (await deviceStorage.get('discriminator', 3840));
        // product name / id and vendor id should match what is in the device certificate
        const vendorId =
            environment.vars.number('vendorid') ??
            (await deviceStorage.get('vendorid', 0xfff1));
        const productName = 'node-matter HA-bridge';
        const productId =
            environment.vars.number('productid') ??
            (await deviceStorage.get('productid', 0x8000));

        const port = environment.vars.number('port') ?? 5540;

        const uniqueId =
            environment.vars.string('uniqueid') ??
            (await deviceStorage.get(
                'uniqueid',
                Time.nowMs().toString(),
            ));

        // Persist basic data to keep them also on restart
        await deviceStorage.set({
            passcode,
            discriminator,
            vendorid: vendorId,
            productid: productId,
            uniqueid: uniqueId,
        });

        return {
            deviceName,
            vendorName,
            passcode,
            discriminator,
            vendorId,
            productName,
            productId,
            port,
            uniqueId,
        };
    }
}
