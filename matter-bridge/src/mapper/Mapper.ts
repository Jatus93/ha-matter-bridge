/* eslint-disable @typescript-eslint/no-explicit-any */
import { setLights } from './devices/lights';
import { Bridge } from '../matter';
import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from '../home-assistant/HAmiddleware';

const LOGGER = new Logger('Mapper');

async function setHasEnties(
    haMiddleware: HAMiddleware,
    bridge: Bridge
): Promise<void> {
    const entities = await haMiddleware.getStatesPartitionedByType();
    LOGGER.info({ entities });
    if (entities['light']) {
        LOGGER.info('adding ', entities['light'].length, 'light devices');
        setLights(entities['light'], haMiddleware, bridge);
    }
}

export async function addAllDevicesToBridge(
    haMiddleware: HAMiddleware,
    bridge: Bridge
): Promise<void> {
    await setHasEnties(haMiddleware, bridge);
    haMiddleware.subscribe();
}
