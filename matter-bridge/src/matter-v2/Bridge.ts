import { AggregatorEndpoint } from '@project-chip/matter.js/endpoint/definitions';
import '@project-chip/matter-node.js';

import { requireMinNodeVersion } from '@project-chip/matter-node.js/util';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import { ServerNode } from '@project-chip/matter.js/node';
requireMinNodeVersion(16);

export class Bridge {
    private server: ServerNode<ServerNode.RootEndpoint>;
    private aggregator: Endpoint<AggregatorEndpoint>;
    constructor(server: ServerNode<ServerNode.RootEndpoint>) {
        this.aggregator = new Endpoint(AggregatorEndpoint, {
            id: 'aggregator',
        });
        this.server = server;
    }

    async addEndpoint(endpoint: Endpoint): Promise<void> {
        await this.aggregator.add(endpoint);
    }

    async start() {
        await this.server.add(this.aggregator);
        await this.server.bringOnline();
    }

    async stop() {
        await this.server.close();
    }
}
