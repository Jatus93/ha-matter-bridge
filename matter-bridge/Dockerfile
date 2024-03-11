ARG BUILD_FROM=ghcr.io/hassio-addons/base:stable
FROM node:20.11.0-alpine as node
FROM ${BUILD_FROM} as runenv

COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

COPY ./package.json ./
COPY ./yarn.lock ./
COPY ./src ./src
COPY ./tsconfig.json ./

RUN npm install -g yarn --force
RUN HUSKY=0 && yarn install --frozen-lockfile
RUN yarn run build
RUN rm -rf ./node_modules
RUN HUSKY=0 && yarn install --production --frozen-lockfile

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]