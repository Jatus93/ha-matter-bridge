import {
    CommissioningServer,
    MatterServer,
} from '@project-chip/matter-node.js';
import {
    Aggregator,
    ComposedDevice,
    Device,
    DeviceTypes,
} from '@project-chip/matter-node.js/device';
import { Logger } from '@project-chip/matter-node.js/log';
import { StorageManager } from '@project-chip/matter-node.js/storage';
import { getIntParameter, getParameter } from '../utils/utils';
import { Time } from '@project-chip/matter-node.js/time';
import { VendorId } from '@project-chip/matter-node.js/datatype';
import { QrCode } from '@project-chip/matter-node.js/schema';
import {
    AttributeInitialValues,
    BridgedDeviceBasicInformationCluster,
} from '@project-chip/matter-node.js/cluster';

export class Bridge {
    private static readonly deviceName =
        getParameter('name') || 'Matter Bridge';
    private static readonly deviceType = DeviceTypes.AGGREGATOR.code;
    private static readonly vendorName = getParameter('vendor') || 'Jatus';
    private static readonly productName = 'HomeAssistant';
    private static readonly port = getIntParameter('port') ?? 5540;
    private ready = false;

    private matterServer: MatterServer;
    private static instace: Bridge;
    private logger = new Logger('bridge');
    private storageManager: StorageManager;
    private aggregator: Aggregator;
    private commissioningServer: CommissioningServer | undefined;

    private constructor(
        matterServer: MatterServer,
        storageManager: StorageManager
    ) {
        this.matterServer = matterServer;
        this.storageManager = storageManager;

        this.aggregator = new Aggregator();
    }

    public static getInstance(
        matterServer: MatterServer,
        storageManager: StorageManager
    ): Bridge {
        if (!Bridge.instace) {
            this.instace = new Bridge(matterServer, storageManager);
        }
        return Bridge.instace;
    }

    private async setupContextAndCommissioningServer(): Promise<CommissioningServer> {
        this.logger.info('setting up context');
        await this.storageManager.initialize();
        const deviceContextStorage =
            this.storageManager.createContext('Bridge-Device');
        const passcode =
            getIntParameter('passcode') ??
            deviceContextStorage.get('passcode', 20202021);
        const discriminator =
            getIntParameter('discriminator') ??
            deviceContextStorage.get('discriminator', 3840);
        const vendorId =
            getIntParameter('vendorid') ??
            deviceContextStorage.get('vendorid', 0xfff1);
        const productId =
            getIntParameter('productid') ??
            deviceContextStorage.get('productid', 0x8000);
        const uniqueId =
            getIntParameter('uniqueid') ??
            deviceContextStorage.get('uniqueid', Time.nowMs());

        deviceContextStorage.set('passcode', passcode);
        deviceContextStorage.set('discriminator', discriminator);
        deviceContextStorage.set('vendorid', vendorId);
        deviceContextStorage.set('productid', productId);
        deviceContextStorage.set('uniqueid', uniqueId);

        const commissioningServer = new CommissioningServer({
            port: Bridge.port,
            deviceName: Bridge.deviceName,
            deviceType: Bridge.deviceType,
            passcode,
            discriminator,
            basicInformation: {
                vendorName: Bridge.vendorName,
                vendorId: VendorId(vendorId),
                nodeLabel: Bridge.productName,
                productName: Bridge.productName,
                productLabel: Bridge.productName,
                productId,
                serialNumber: `node-matter-${uniqueId}`,
            },
        });

        return commissioningServer;
    }

    addDevice(
        device: Device | ComposedDevice,
        bridgedBasicInformation?: AttributeInitialValues<
            typeof BridgedDeviceBasicInformationCluster.attributes
        >
    ) {
        if (!this.commissioningServer?.isCommissioned()) {
            this.logger.warn('System not initialized, may cause crashes');
        }
        this.aggregator.addBridgedDevice(device, bridgedBasicInformation);
    }

    async start() {
        this.logger.info('Starting...');
        this.commissioningServer =
            await this.setupContextAndCommissioningServer();
        this.commissioningServer.addDevice(this.aggregator);
        this.matterServer.addCommissioningServer(this.commissioningServer);
        await this.matterServer.start();
        this.logger.info('Listening');
        if (!this.commissioningServer.isCommissioned()) {
            const pairingData = this.commissioningServer.getPairingCode();
            const { qrPairingCode, manualPairingCode } = pairingData;

            console.log(QrCode.get(qrPairingCode));
            this.logger.info(
                `QR Code URL: https://project-chip.github.io/connectedhomeip/qrcode.html?data=${qrPairingCode}`
            );
            this.logger.info(`Manual pairing code: ${manualPairingCode}`);
        } else {
            this.logger.info(
                'Device is already commissioned. Waiting for controllers to connect ...'
            );
        }
    }

    async stop() {
        this.matterServer.close();
        this.storageManager
            .close()
            .then(() => process.exit(0))
            .catch((err) => this.logger.error(err));
    }
}
