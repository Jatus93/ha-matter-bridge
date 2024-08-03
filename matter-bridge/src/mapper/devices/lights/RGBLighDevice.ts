import { ExtendedColorLightDevice } from '@project-chip/matter.js/devices/ExtendedColorLightDevice';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import { BridgedDeviceBasicInformationServer } from '@project-chip/matter.js/behavior/definitions/bridged-device-basic-information';

import pkg from 'crypto-js';
const { MD5 } = pkg;
import { HassEntity } from '@ha/HAssTypes.js';
import {
    AddHaDeviceToBridge,
    Bridge,
    HAMiddleware,
    StateQueue,
} from '../MapperType.js';
import { Logger } from '@project-chip/matter-node.js/log';
import { getOnOffFunction } from './OnOffLightDevice.js';
// import { getDimFunction } from './DimmableLightDevice.js';

export const addRGBLightDevice: AddHaDeviceToBridge = async (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Promise<StateQueue> => {
    const logger = new Logger(`RGBLight ${haEntity.entity_id}`);

    const serialFromId = MD5(haEntity.entity_id).toString();
    const stateQueue = new StateQueue();
    const endpoint = new Endpoint(
        ExtendedColorLightDevice.with(
            BridgedDeviceBasicInformationServer,
        ),
        {
            id: `rgb-light-${serialFromId}`,
        },
    );

    endpoint.events.onOff.onOff$Changed.on(
        getOnOffFunction(
            logger,
            haEntity.entity_id,
            stateQueue,
            haMiddleware,
        ),
    );

    await bridge.addEndpoint(endpoint);

    return stateQueue;
};
