import { MatterServer } from '@project-chip/matter-node.js';
import {
    StorageBackendDisk,
    StorageManager,
} from '@project-chip/matter-node.js/storage';
import {
    getParameter,
    hasParameter,
} from '@project-chip/matter-node.js/util';
export { Bridge } from './Bridge';
import { Bridge } from './Bridge';

let MATTER_SERVER: MatterServer;
let STORAGE: StorageBackendDisk;
let STORAGE_MANAGER: StorageManager;

export function serverSetup(): {
    matterServer: MatterServer;
    storageManager: StorageManager;
} {
    if (!(MATTER_SERVER && STORAGE && STORAGE_MANAGER)) {
        const storageLocation =
            getParameter('store') || '/config/deviceData';

        STORAGE = new StorageBackendDisk(
            storageLocation,
            hasParameter('clearstorage'),
        );
        STORAGE_MANAGER = new StorageManager(STORAGE);
        MATTER_SERVER = new MatterServer(STORAGE_MANAGER, {
            mdnsInterface: getParameter('netinterface'),
        });
    }
    return {
        matterServer: MATTER_SERVER,
        storageManager: STORAGE_MANAGER,
    };
}

export function getBridge(): Bridge {
    const serverData = serverSetup();
    const bridge = Bridge.getInstance(
        serverData.matterServer,
        serverData.storageManager,
    );
    return bridge;
}
