FROM node:latest

# Setting timezone
ENV TZ=America/Vancouver
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app

VOLUME ["/usr/src/app/data"]

COPY package*.json ./
COPY yarn.lock ./
RUN npm install

COPY . .

CMD ["node", "index.ts"]
