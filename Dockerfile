FROM node:slim

RUN apt update && wget "https://github.com/jellyfin/jellyfin-ffmpeg/releases/download/v/jellyfin-ffmpeg7_7.0.2-9-$(. /etc/os-release && echo $VERSION_CODENAME)_$(dpkg --print-architecture).deb" -O /tmp/ffmpeg.deb && dpkg -i /tmp/ffmpeg.deb && apt install -fy && apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm i
COPY . .

ENTRYPOINT [ "/usr/local/bin/npm", "start" ]
