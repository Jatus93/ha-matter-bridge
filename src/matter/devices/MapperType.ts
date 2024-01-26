import { Device } from "@project-chip/matter-node.js/device";
import { HAMiddleware, Bridge } from "..";
import { HassEntity } from "../../HA/HAssTypes";

export type AddHaDeviceToBridge = (haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge) => Device
