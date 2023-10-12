FROM node:18.18.0
WORKDIR /home/spotifyz-api
COPY package.json .
RUN yarn
COPY . .

