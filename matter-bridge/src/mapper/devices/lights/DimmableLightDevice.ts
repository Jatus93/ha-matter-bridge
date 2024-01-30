import {
    Device,
    DimmableLightDevice,
} from '@project-chip/matter-node.js/device';
import { MD5 } from 'crypto-js';
import {
    HassEntity,
    StateChangedEvent,
} from '../../../home-assistant/HAssTypes';
import { AddHaDeviceToBridge, Bridge, HAMiddleware } from '../MapperType';
import { Logger } from '@project-chip/matter-node.js/log';

const LOGGER = new Logger('DimmableLight');
export const addDimmableLightDevice: AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge
): Device => {
    LOGGER.debug(
        `Building device ${haEntity.entity_id} \n ${JSON.stringify({
            haEntity,
        })}`
    );
    const device = new DimmableLightDevice(
        { onOff: haEntity.state === 'on' },
        {
            currentLevel:
                Number(haEntity.attributes['brightness']) / 255 || null,
            onLevel: 0.1,
            options: { coupleColorTempToLevel: false, executeIfOff: false },
        }
    );
    const serialFromId = MD5(haEntity.entity_id).toString();
    device.addOnOffListener((value, oldValue) => {
        LOGGER.debug(
            `OnOff Event for device ${haEntity.entity_id}, ${JSON.stringify({
                value,
                oldValue,
            })}`
        );
        if (value !== oldValue) {
            haMiddleware.callAService('light', value ? 'turn_on' : 'turn_off', {
                entity_id: haEntity.entity_id,
            });
        }
    });
    device.addCommandHandler(
        'identify',
        async ({ request: { identifyTime } }) =>
            LOGGER.info(
                `Identify called for OnOffDevice ${haEntity.attributes['friendly_name']} with id: ${serialFromId} and identifyTime: ${identifyTime}`
            )
    );

    device.addCurrentLevelListener((value) => {
        LOGGER.debug(
            `CurrentLevel Event for device ${haEntity.entity_id} value: ${value}`
        );
        haMiddleware.callAService(
            'light',
            Number(value) > 0 ? 'turn_on' : 'turn_off',
            { entity_id: haEntity.entity_id, brightness: Number(value) }
        );
    });

    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            LOGGER.debug(`Event for device ${haEntity.entity_id}`);
            LOGGER.debug(JSON.stringify(event));
            device.setOnOff(event.data.new_state?.state === 'on');
            device.setCurrentLevel(
                (event.data.new_state?.attributes as never)['brightness']
            );
        }
    );

    bridge.addDevice(device, {
        nodeLabel: haEntity.attributes['friendly_name'],
        reachable: true,
        serialNumber: serialFromId,
    });
    return device;
};
