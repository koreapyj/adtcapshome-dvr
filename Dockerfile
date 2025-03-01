FROM node:slim

RUN apt update && apt install -y busybox curl && curl -L "https://github.com/jellyfin/jellyfin-ffmpeg/releases/download/v7.0.2-9/jellyfin-ffmpeg7_7.0.2-9-$(. /etc/os-release && echo $VERSION_CODENAME)_$(dpkg --print-architecture).deb" -o /tmp/ffmpeg.deb && (dpkg -i /tmp/ffmpeg.deb; rm /tmp/ffmpeg.deb; apt install -fy) && ln -s /usr/share/jellyfin-ffmpeg/ffmpeg /usr/bin && ln -s /usr/share/jellyfin-ffmpeg/ffprobe /usr/bin && apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm i
COPY . .

ENTRYPOINT [ "/usr/local/bin/npm", "start" ]
