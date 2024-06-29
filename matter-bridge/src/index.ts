import { getIntParameter, getParameter } from './utils/utils.js';
import { Bridge } from './matter/Bridge.js';
import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from './home-assistant/HAmiddleware.js';
import { addAllDevicesToBridge } from './mapper/Mapper.js';

const LOGGER = new Logger('Main');
let HA_MIDDLEWARE: HAMiddleware;
let BRIDGE: Bridge;

async function run() {
    LOGGER.info('Startup ...');
    const token =
        getParameter('SUPERVISOR_TOKEN') || getParameter('HA_TOKEN');
    if (!token) {
        throw new Error('Missing auth token cannot run without it');
    }
    HA_MIDDLEWARE = await HAMiddleware.getInstance({
        host: getParameter('HA_HOST') || 'supervisor',
        port: getIntParameter('HA_PORT') || 80,
        path: getParameter('HA_PATH') || '/core/websocket',
        token,
    });
    LOGGER.info('Connected to home assistant');
    BRIDGE = await Bridge.create();
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
        .catch((err: Error) => LOGGER.error(err));
});
