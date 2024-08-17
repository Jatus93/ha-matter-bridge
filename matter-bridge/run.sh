#!/usr/bin/with-contenv bashio

export CONFIG_PATH=./config
export DEVICES_FILE=confDevices.json
export BRIDGE_LOCK=bridge.lck
export PORT=2839

node ./web-ui/build &
node ./service/build --storage-path=.${CONFIG_PATH}/deviceData
