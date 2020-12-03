FROM node:latest
WORKDIR /usr/src/app
COPY package*.json ./
COPY yarn.lock ./
RUN npm install
COPY . .
CMD ["node", "index.ts"]
