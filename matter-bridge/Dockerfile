ARG BUILD_FROM=ghcr.io/hassio-addons/base:15.0.3

FROM node:18.19.0-alpine as buildbase

COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./src ./src
COPY ./tsconfig.json ./
RUN npm install
RUN npm run build

FROM node:18.19.0-alpine as deps

COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./src ./src
COPY ./tsconfig.json ./
RUN npm install --production


FROM ${BUILD_FROM} as runenv

COPY --from=buildbase /usr/lib /usr/lib
COPY --from=buildbase /usr/local/lib /usr/local/lib
COPY --from=buildbase /usr/local/include /usr/local/include
COPY --from=buildbase /usr/local/bin /usr/local/bin
COPY --from=buildbase ./build ./build
COPY --from=deps ./node_modules ./node_modules
COPY --from=deps ./package.json ./package.json


COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]