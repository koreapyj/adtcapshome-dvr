FROM node:slim

RUN apt update && apt install -y ffmpeg && apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm i
COPY . .

ENTRYPOINT [ "/usr/local/bin/npm", "start" ]
