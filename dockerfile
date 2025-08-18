FROM node:22.18.0-alpine

WORKDIR /app

COPY package*.json .

RUN npm i --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "start"]