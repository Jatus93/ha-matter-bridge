import { Bridge, HAMiddleware, addAllDevicesToBridge } from './matter';
import { serverSetup } from './matter/server';
import { Logger } from '@project-chip/matter-node.js/log';

let LOGGER = new Logger('Main');
let BRIDGE: Bridge;
let HA_MIDDLEWARE: HAMiddleware;
const SERVER_DATA = serverSetup();

async function run() {
    HA_MIDDLEWARE = await HAMiddleware.getInstance({
        host: process.env.HA_HOST,
        port: Number(process.env.HA_PORT),
        token: process.env.HA_ACCESS_TOKEN,
    });
    BRIDGE = Bridge.getInstance(
        SERVER_DATA.matterServer,
        SERVER_DATA.storageManager
    );
    await addAllDevicesToBridge(HA_MIDDLEWARE, BRIDGE);
    BRIDGE.start();
}

run().then().catch(LOGGER.error);

process.on('SIGINT', () => {
    HA_MIDDLEWARE.stop();
    BRIDGE.stop()
        .then(() => {
            // Pragmatic way to make sure the storage is correctly closed before the process ends.
            SERVER_DATA.storageManager
                .close()
                .then(() => process.exit(0))
                .catch((err) => LOGGER.error(err));
        })
        .catch((err) => LOGGER.error(err));
});
