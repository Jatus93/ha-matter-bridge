import { Endpoint } from '@project-chip/matter.js/endpoint';
import { HassEntity } from '../../home-assistant/HAssTypes.js';

import { HAMiddleware } from '../../home-assistant/HAmiddleware.js';
import { Bridge } from '../../matter/Bridge.js';

export type AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) => Endpoint;

export { HAMiddleware };
export { Bridge };
