# Étape 1 : Image de build
FROM node:20 AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Étape 2 : Image finale plus légère
FROM node:20-slim

WORKDIR /usr/src/app

COPY --from=build /usr/src/app .

EXPOSE 3000

CMD ["node", "server.js"]
