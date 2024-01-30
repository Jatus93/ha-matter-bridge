ARG BUILD_FROM=ghcr.io/hassio-addons/base:15.0.3
FROM node:18.19.0-alpine as node
FROM ${BUILD_FROM} as runenv

COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./src ./src
COPY ./tsconfig.json ./

RUN HUSKY=0 && npm install
RUN npm run build
RUN rm -rf ./node_modules
RUN HUSKY=0 && npm install --production

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]