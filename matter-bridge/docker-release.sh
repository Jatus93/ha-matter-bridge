#!/bin/bash

docker login ghcr.io -u $DOCKER_USERNAME --password $DOCKER_PASSWORD
docker tag jatus93/ha-matter-bridge:build ghcr.io/jatus93/ha-matter-bridge:$S1
docker push ghcr.io/jatus93/ha-matter-bridge:$S1
if [[ $2 =~ (release\/.*) ]];
then
    docker tag jatus93/ha-matter-bridge:build ghcr.io/jatus93/ha-matter-bridge:latest
    docker push
fi