-include .env
export

export CONFIG_PATH=./config
export DEVICES_FILE=confDevices.json
export BRIDGE_LOCK=bridge.lck
export PORT=2839

build-service:
	cd service && yarn build

run-service:
	node ./service/build --storage-path=.${CONFIG_PATH}/deviceData

build-web-ui:
	cd web-ui && yarn build

run-web-ui:
	node ./web-ui/build
