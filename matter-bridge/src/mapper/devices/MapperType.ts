import { Endpoint } from '@project-chip/matter.js/endpoint';
import { EndpointType } from '@project-chip/matter.js/endpoint/type';
import { HassEntity } from '../../home-assistant/HAssTypes.js';

import { HAMiddleware } from '../../home-assistant/HAmiddleware.js';
import { Bridge } from '../../matter/Bridge.js';

export type AddHaDeviceToBridge<
    T extends EndpointType = EndpointType.Empty,
> = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
) => Endpoint<T>;

export { HAMiddleware };
export { Bridge };
