import { Device } from '@project-chip/matter-node.js/device';
import { HassEntity } from '../../home-assistant/HAssTypes';

import { HAMiddleware } from '../../home-assistant/HAmiddleware';
import { Bridge } from '../../matter';

export type AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge
) => Device;

export { HAMiddleware } from '../../home-assistant/HAmiddleware';
export { Bridge } from '../../matter';
