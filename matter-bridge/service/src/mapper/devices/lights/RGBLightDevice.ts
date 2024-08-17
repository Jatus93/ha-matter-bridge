import { ExtendedColorLightDevice } from '@project-chip/matter.js/devices/ExtendedColorLightDevice';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import { BridgedDeviceBasicInformationServer } from '@project-chip/matter.js/behavior/definitions/bridged-device-basic-information';
import { ColorControlServer } from '@project-chip/matter.js/behavior/definitions/color-control';
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
            ColorControlServer,
        ),
        {
            id: `rgb-light-${serialFromId}`,
            bridgedDeviceBasicInformation: {},
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

    endpoint.events.colorControl?.colorPointBIntensity$Changed?.on(
        (newValue, oldValue) => {
            logger.info(
                JSON.stringify({ newValue, oldValue }, null, 4),
            );
        },
    );

    endpoint.events.colorControl?.colorPointGIntensity$Changed?.on(
        (newValue, oldValue) => {
            logger.info(
                JSON.stringify({ newValue, oldValue }, null, 4),
            );
        },
    );

    endpoint.events.colorControl?.colorPointRIntensity$Changed?.on(
        (newValue, oldValue) => {
            logger.info(
                JSON.stringify({ newValue, oldValue }, null, 4),
            );
        },
    );

    await bridge.addEndpoint(endpoint);

    return stateQueue;
};
