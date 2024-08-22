import { getIntParameter, getParameter } from './utils/utils.js';
import { Bridge } from './matter/Bridge.js';
import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from './home-assistant/HAmiddleware.js';
import { addAllDevicesToBridge } from './mapper/Mapper.js';
import { readFile } from 'node:fs/promises';
import { watchFile, existsSync } from 'node:fs';

const LOGGER = new Logger('Main');
let HA_MIDDLEWARE: HAMiddleware;
let BRIDGE: Bridge;

async function startHASS() {
    LOGGER.info('Startup Home Assistant...');
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
    LOGGER.info('Home Assistant connected');
}

export async function startBridge() {
    BRIDGE = await Bridge.create();
    LOGGER.info('Creating the bridge');
    await addAllDevicesToBridge(HA_MIDDLEWARE, BRIDGE);
    LOGGER.info('all devices added');
    BRIDGE.start();
}

async function loadStatus(path: string) {
    const fileExtist = existsSync(path);
    const result = JSON.parse(
        (
            await readFile(
                path,
                fileExtist
                    ? undefined
                    : {
                          flag: 'w+',
                      },
            )
        ).toString() || '{"start": false}',
    ) as { start: boolean };
    return result;
}

async function run() {
    await startHASS();
    await HA_MIDDLEWARE.updateLocalDevices(
        `${getParameter('CONFIG_PATH')}/${getParameter('DEVICES_FILE')}`,
    );
    const { start } = await loadStatus(
        `${getParameter('CONFIG_PATH')}/${getParameter('BRIDGE_LOCK')}`,
    );
    if (start) {
        startBridge();
    }
    watchFile(
        `${getParameter('CONFIG_PATH')}/${getParameter('BRIDGE_LOCK')}`,
        { persistent: true },
        async () => {
            const serviceStatus = JSON.parse(
                (
                    await readFile(
                        `${getParameter('CONFIG_PATH')}/${getParameter('BRIDGE_LOCK')}`,
                    )
                ).toString(),
            );
            if (serviceStatus['start']) {
                startBridge();
            } else {
                BRIDGE?.stop()
                    .then(() => process.exit(0))
                    .catch((err: Error) => LOGGER.error(err));
            }
        },
    );
}

run()
    .then()
    .catch((error) => {
        console.error(error);
        LOGGER.error(JSON.stringify(error));
    });

process.on('SIGINT', () => {
    HA_MIDDLEWARE.stop();
    BRIDGE?.stop()
        .then(() => process.exit(0))
        .catch((err: Error) => LOGGER.error(err));
});
