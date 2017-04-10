# Docker container for building NVD3 + running tests locally
FROM mojo/debian:wheezy
MAINTAINER Jeremy Nagel <jnagel@cozero.com.au>

# add wheezy backports
RUN echo "deb http://ftp.us.debian.org/debian wheezy-backports main" >> /etc/apt/sources.list

# get firefox .. aka iceweasel
RUN echo "deb http://mozilla.debian.net/ jessie-backports firefox-release" >> /etc/apt/sources.list
RUN apt-get update

# get node, java, xvfb
RUN apt-get install -y curl nodejs-legacy unzip openjdk-7-jre-headless xvfb

# get firefox
RUN apt-get install -t wheezy-backports -y --force-yes iceweasel

# get fonts so xvfb does not yell at us
RUN apt-get install -y -q xfonts-100dpi xfonts-75dpi xfonts-scalable xfonts-cyrillic

# install NPM
RUN curl --insecure https://www.npmjs.org/install.sh | clean=no sh

# install selenium standalone webdriver
RUN curl http://selenium-release.storage.googleapis.com/2.41/selenium-server-standalone-2.41.0.jar > /usr/local/bin/selenium.jar

ADD https://gist.github.com/elbaschid/5a91271c07bb0de7bfa6/raw/d07b4eecf02fd3341ef72753e4c5875cf137bda8/xvfb-run.sh /usr/bin/xvfb-run
RUN chmod u+x /usr/bin/xvfb-run

WORKDIR /usr/local/src
COPY . /usr/local/src
RUN npm install
