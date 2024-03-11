import { Time } from '@project-chip/matter-node.js/time';
import {
    DeviceTypeId,
    VendorId,
} from '@project-chip/matter.js/datatype';
import { OnOffLightDevice } from '@project-chip/matter.js/devices/OnOffLightDevice';
import { OnOffPlugInUnitDevice } from '@project-chip/matter.js/devices/OnOffPlugInUnitDevice';
import {
    Environment,
    StorageService,
} from '@project-chip/matter.js/environment';
import { ServerNode } from '@project-chip/matter.js/node';
import { Bridge } from './Bridge.js';
export { Bridge };

const {
    isSocket,
    deviceName,
    vendorName,
    passcode,
    discriminator,
    vendorId,
    productName,
    productId,
    port,
    uniqueId,
} = await getConfiguration();

const MAIN_SERVER_NODE = await ServerNode.create({
    // Required: Give the Node a unique ID which is used to store the state of this node
    id: uniqueId,

    // Provide Network relevant configuration like the port
    // Optional when operating only one device on a host, Default port is 5540
    network: {
        port,
    },

    // Provide Commissioning relevant settings
    // Optional for development/testing purposes
    commissioning: {
        passcode,
        discriminator,
    },

    // Provide Node announcement settings
    // Optional: If Ommitted some development defaults are used
    productDescription: {
        name: deviceName,
        deviceType: DeviceTypeId(
            isSocket[0]
                ? OnOffPlugInUnitDevice.deviceType
                : OnOffLightDevice.deviceType,
        ),
    },

    // Provide defaults for the BasicInformation cluster on the Root endpoint
    // Optional: If Omitted some development defaults are used
    basicInformation: {
        vendorName,
        vendorId: VendorId(vendorId),
        nodeLabel: productName,
        productName,
        productLabel: productName,
        productId,
        serialNumber: `matterjs-${uniqueId}`,
        uniqueId,
    },
});

export async function getConfiguration() {
    /**
     * Collect all needed data
     *
     * This block collects all needed data from cli, environment or storage. Replace this with where ever your data come from.
     *
     * Note: This example uses the matter.js process storage system to store the device parameter data for convenience
     * and easy reuse. When you also do that be careful to not overlap with Matter-Server own storage contexts
     * (so maybe better not do it ;-)).
     */
    const environment = Environment.default;

    const storageService = environment.get(StorageService);
    console.log(
        `Storage location: ${storageService.location} (Directory)`,
    );
    console.log(
        'Use the parameter "--storage-path=NAME-OR-PATH" to specify a different storage location in this directory, use --storage-clear to start with an empty storage.',
    );
    const deviceStorage = (
        await storageService.open('device')
    ).createContext('data');

    const isSocket = Array<boolean>();
    const numDevices = environment.vars.number('num') || 2;
    if (deviceStorage.has('isSocket')) {
        console.log(
            'Device types found in storage. --type parameter is ignored.',
        );
        deviceStorage
            .get<Array<boolean>>('isSocket')
            .forEach((type) => isSocket.push(type));
    }
    for (let i = 1; i <= numDevices; i++) {
        if (isSocket[i - 1] !== undefined) {
            continue;
        }
        isSocket.push(
            environment.vars.string(`type${i}`) === 'socket',
        );
    }

    const deviceName =
        environment.vars.string('name') || 'Matter Bridge';
    const vendorName = environment.vars.string('vendor') || 'Jatus';
    const passcode =
        environment.vars.number('passcode') ??
        deviceStorage.get('passcode', 20202021);
    const discriminator =
        environment.vars.number('discriminator') ??
        deviceStorage.get('discriminator', 3840);
    // product name / id and vendor id should match what is in the device certificate
    const vendorId =
        environment.vars.number('vendorid') ??
        deviceStorage.get('vendorid', 0xfff1);
    const productName = `node-matter OnOff ${isSocket ? 'Socket' : 'Light'}`;
    const productId =
        environment.vars.number('productid') ??
        deviceStorage.get('productid', 0x8000);

    const port = environment.vars.number('port') ?? 5540;

    const uniqueId =
        environment.vars.string('uniqueid') ??
        deviceStorage.get('uniqueid', Time.nowMs().toString());

    // Persist basic data to keep them also on restart
    deviceStorage.set('passcode', passcode);
    deviceStorage.set('discriminator', discriminator);
    deviceStorage.set('vendorid', vendorId);
    deviceStorage.set('productid', productId);
    deviceStorage.set('isSocket', isSocket);
    deviceStorage.set('uniqueid', uniqueId);

    return {
        isSocket,
        deviceName,
        vendorName,
        passcode,
        discriminator,
        vendorId,
        productName,
        productId,
        port,
        uniqueId,
    };
}

export function getBridge(): Bridge {
    const bridge = new Bridge(MAIN_SERVER_NODE);
    return bridge;
}
