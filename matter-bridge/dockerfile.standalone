FROM node:18.19.0-alpine
WORKDIR /app
COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./src ./src
COPY ./tsconfig.json ./


RUN npm install
RUN npm install ts-node

CMD [ "npm", "run", "start" ]