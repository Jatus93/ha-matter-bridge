import { Logger } from '@project-chip/matter-node.js/log';
import { HAMiddleware } from '../../../home-assistant/HAmiddleware.js';
import { HassEntity } from '../../../home-assistant/HAssTypes.js';
import { Bridge } from '../MapperType.js';
import { addRollerShadeEndpoint } from './RollerShade.js';

const LOGGER = new Logger('WindowCovers');

export function setWindowCovers(
    covers: HassEntity[],
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): void {
    covers.forEach((coverElement) => {
        LOGGER.info(coverElement.entity_id);
        LOGGER.info({
            attributes: coverElement.attributes,
        });
        addRollerShadeEndpoint(coverElement, haMiddleware, bridge);
    });
}
