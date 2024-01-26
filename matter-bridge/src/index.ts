import { getParameter } from './utils/utils';
import { Bridge, getBridge } from './matter';
import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from './home-assistant/HAmiddleware';
import { addAllDevicesToBridge } from './mapper/Mapper';

const LOGGER = new Logger('Main');
let HA_MIDDLEWARE: HAMiddleware;
let BRIDGE: Bridge;

async function run() {
    LOGGER.info('Startup ...');
    const token = getParameter('SUPERVISOR_TOKEN');
    if (!token) {
        throw new Error('Missing auth token cannot run without it');
    }
    HA_MIDDLEWARE = await HAMiddleware.getInstance({
        host: 'supervisor',
        port: 80,
        path: '/core/websocket',
        token,
    });
    LOGGER.info('Connected to home assistant');
    BRIDGE = getBridge();
    LOGGER.info('Creating the bridge');
    await addAllDevicesToBridge(HA_MIDDLEWARE, BRIDGE);
    LOGGER.info('all devices added');
    BRIDGE.start();
}

run()
    .then()
    .catch((error) => {
        console.error(error);
        LOGGER.error(JSON.stringify(error));
    });

process.on('SIGINT', () => {
    HA_MIDDLEWARE.stop();
    BRIDGE.stop()
        .then(() => process.exit(0))
        .catch((err) => LOGGER.error(err));
});
