/* eslint-disable @typescript-eslint/no-explicit-any */
import { Device, OnOffLightDevice } from "@project-chip/matter-node.js/device";
import { MD5 } from "crypto-js";
import { HAMiddleware, Bridge } from "../..";
import { HassEntity, StateChangedEvent } from "../../../HA/HAssTypes";
import { AddHaDeviceToBridge } from "../MapperType";
import { Logger } from "@project-chip/matter-node.js/log";

const LOGGER = new Logger('OnOfflIght');
export const addOnOffLightDevice: AddHaDeviceToBridge = (haEntity: HassEntity, haMiddleware: HAMiddleware, bridge: Bridge): Device => {
    const device = new OnOffLightDevice();
    const serialFromId = MD5(haEntity.entity_id).toString();
    device.addOnOffListener((value, oldValue) => {
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
    haMiddleware.subscrieToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            device.setOnOff(event.data.new_state?.state === 'on');
        }
    );
    bridge.addDevice(device, {
        nodeLabel: haEntity.attributes['friendly_name'],
        reachable: true,
        serialNumber: serialFromId,
    });
    return device;
}