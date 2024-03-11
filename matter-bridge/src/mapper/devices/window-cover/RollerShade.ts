import '@project-chip/matter-node.js';

import {
    GoToLiftPercentageRequest,
    WindowCoveringServer,
} from '@project-chip/matter.js/behaviors/window-covering';
import { WindowCoveringDevice } from '@project-chip/matter.js/devices/WindowCoveringDevice';
import {
    AddHaDeviceToBridge,
    Bridge,
    HAMiddleware,
} from '../MapperType.js';
import {
    HassEntity,
    StateChangedEvent,
} from '../../../home-assistant/HAssTypes.js';
import { Endpoint } from '@project-chip/matter.js/endpoint';
import { Logger } from '@project-chip/matter-node.js/log';
import pkg from 'crypto-js';
const { MD5 } = pkg;

const LOGGER = new Logger('RollerShade');

/**
 * This example demonstrates implementation of a "composed" device comprising multiple sub-devices
 *
 * Our example device, the Excelsior 1000 EZ-Nite™, is a roller shade with an illuminated valance.
 */

const LiftingWindowCoveringServer = WindowCoveringServer.with(
    'Lift',
    'AbsolutePosition',
    'PositionAwareLift',
);

/**
 * Implementation of the Matter WindowCovering cluster for the shade motor.
 *
 * TODO - some of this should probably move to WindowCoveringServer
 */
class RollerShade extends LiftingWindowCoveringServer {
    get currentPos() {
        return this.state.currentPositionLiftPercent100ths ?? 0;
    }

    get targetPos() {
        return this.state.targetPositionLiftPercent100ths ?? 0;
    }

    set targetPos(position: number) {
        this.state.targetPositionLiftPercent100ths = position ?? 0;
    }

    override async initialize() {
        this.reactTo(
            this.events.targetPositionLiftPercent100ths$Change,
            this.writeTargetToMotor,
        );

        await this.readTargetFromMotor();
        if (this.targetPos === null) {
            this.targetPos = this.currentPos;
        }
    }

    override upOrOpen() {
        // 0 = 0%, fully open
        this.targetPos = 0;
    }

    override downOrClose() {
        // 10000 = 100%, fully closed
        this.targetPos = 10000;
    }

    override stopMotion() {
        this.targetPos = this.currentPos;
    }

    override goToLiftPercentage(
        this: RollerShade,
        request: GoToLiftPercentageRequest,
    ) {
        this.targetPos = request.liftPercent100thsValue;
    }

    /* eslint require-await: 0 */
    protected async writeTargetToMotor() {
        // For this contrived example we just log the target position and don't actually animate our fake roller shade
        console.log(
            'Window covering target position is now',
            `${this.targetPos / 100}%`,
        );
    }

    /* eslint require-await: 0 */
    protected async readTargetFromMotor() {
        // Our fake shade is stuck open
        this.state.currentPositionLiftPercent100ths = 0;
    }

    protected set currentPos(value: number) {
        this.state.currentPositionLiftPercent100ths = value;
    }
}

export const addRollerShadeEndpoint: AddHaDeviceToBridge = (
    haEntity: HassEntity,
    haMiddleware: HAMiddleware,
    bridge: Bridge,
): Endpoint => {
    const serialFromId = MD5(haEntity.entity_id).toString();

    const endpoint = new Endpoint(
        WindowCoveringDevice.with(RollerShade),
        { id: `ha-light-${serialFromId}` },
    );
    endpoint.events.windowCovering.currentPositionLiftPercent100ths$Change.on(
        (value) => {
            haMiddleware.callAService('cover', 'set_cover_position', {
                entity_id: 'cover.tapparella_cameretta',
                position: value,
            });
        },
    );
    haMiddleware.subscribeToDevice(
        haEntity.entity_id,
        (event: StateChangedEvent) => {
            LOGGER.debug(`Event for device ${haEntity.entity_id}`);
            LOGGER.debug(JSON.stringify(event));
            endpoint.set({
                windowCovering: {
                    currentPositionLiftPercentage:
                        Number(
                            event.data.new_state?.attributes[
                                'position'
                            ],
                        ) || undefined,
                },
            });
        },
    );
    bridge.addEndpoint(endpoint);
    return endpoint;
};
