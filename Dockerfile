FROM node:12-alpine
USER root
WORKDIR /data

ARG flux_version=5.0.0
#ARG arch=x86_64

RUN apk add --no-cache git make python3 py3-pip build-base bash

# You can confirm your timezone by setting the TZ database name field from:
# https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
#ARG local_timezone=Europe/Berlin

# Update apt cache and set tzdata to non-interactive or it will fail later.
# Also install essential dependencies for the build project.
#RUN DEBIAN_FRONTEND="noninteractive" apt-get update \
#  && apt-get -y install tzdata \
#  && ln -fs /usr/share/zoneinfo/${local_timezone} /etc/localtime \
#  && dpkg-reconfigure --frontend noninteractive tzdata \
#  && apt-get install -y wget git build-essential libtool autotools-dev automake \
#  && apt-get install -y nodejs npm && \
  #pkg-config libssl-dev libevent-dev bsdmainutils python3 libboost-system-dev \
  #libboost-filesystem-dev libboost-chrono-dev libboost-test-dev libboost-thread-dev \
  #libdb-dev libdb++-dev && \
#  apt-get clean

# Clone the Core wallet source from GitHub and checkout the version.
#RUN git clone https://github.com/DigiByte-Core/digibyte/ --branch ${dgb_version} --single-branch

# Use multiple processors to build DigiByte from source.
# Warning: It will try to utilize all your systems cores, which speeds up the build process,
# but consumes a lot of memory which could lead to OOM-Errors during the build process.
# Recommendation: Enable this on machines that have more than 16GB RAM.
#ARG parallize_build=0

# Determine how many cores the build process will use.
#RUN export CORES="" && [ $parallize_build -gt 1 ] && export CORES="-j $(nproc)"; \
#  echo "Using $parallize_build core(s) for build process."

# Prepare the build process
ARG rootdatadir=/data
#RUN cd ${rootdatadir}/digibyte && ./autogen.sh \
#  && ./configure --without-gui --with-incompatible-bdb

# Start the build process
#RUN cd ${rootdatadir}/digibyte \
#  && make $CORES \
#  && make install

# Delete source
#RUN rm -rf ${rootdatadir}/digibyte

RUN mkdir -vp \
  "/root/rosetta-node" \
  #"${rootdatadir}/.digibyte" \
  "${rootdatadir}/utxodb" \
  "/tmp/npm_install"

# Copy and install rosetta implementation
COPY package.json /tmp/npm_install/
RUN cd /tmp/npm_install && \
  npm set progress=false && \
  npm config set depth 0 && \
  npm install 
RUN cp -a /tmp/npm_install/node_modules "/root/rosetta-node/"

# Copy the source to rosetta node directory
COPY package*.json "/root/rosetta-node/"
COPY config "/root/rosetta-node/config"
COPY index.js "/root/rosetta-node/index.js"
COPY src "/root/rosetta-node/src"
#COPY test "/root/rosetta-node/test"

# General args
#ARG rpc_username=user
#ARG rpc_password=pass
#ARG offline=0
#ARG regtest_simulate_mining=0

# Set to 1 for running it in testnet mode
#ARG use_testnet=0

# OR set this to 1 to enable Regtest mode.
# Note: Only one of the above can be set exclusively.
#ARG use_regtest=0

# Do we want any blockchain pruning to take place? Set to 4096 for a 4GB blockchain prune.
# Alternatively set size=1 to prune with RPC call 'pruneblockchainheight <height>'
#ARG prunesize=0

# Create digibyte.conf file
#RUN bash -c 'echo -e "\
#server=1\n\
#prune=${prunesize}\n\
#maxconnections=300\n\
#rpcallowip=127.0.0.1\n\
#daemon=1\n\
#rpcuser=${rpc_username}\n\
#rpcpassword=${rpc_password}\n\
#txindex=0\n\
## Uncomment below if you need Dandelion disabled for any reason but it is left on by default intentionally\n\
#disabledandelion=1\n\
#addresstype=bech32\n\
#testnet=${use_testnet}\n\
#rpcworkqueue=32\n\
#regtest=${use_regtest}\n\
#[regtest]\n\
#rpcbind=127.0.0.1\n\
#listen=1\n" | tee "${rootdatadir}/digibyte.conf"'#

# Set some environment variables
ENV ROOTDATADIR "$rootdatadir"
ENV ROSETTADIR "/root/rosetta-node"
ENV VERSION "$flux_version"
ENV ONLINE_PORT 8080
ENV OFFLINE_PORT 8081
ENV HOST 0.0.0.0
ENV DATA_PATH "${rootdatadir}/utxodb"
ENV RPC_USER "$rpc_username"
ENV RPC_PASS "$rpc_password"
ENV CONNECTION "fluxlocal"
ENV NETWORK "mainnet"
#ENV OFFLINE_MODE "$offline"
#ENV RUN_TESTS 1

#RUN if [ "$use_testnet" = "0" ]; \
#    then \
#      echo 'export NETWORK="mainnet"' >> ~/env; \
#    elif [ "$use_testnet" = "1" ]; \
#    then \
#      echo 'export NETWORK="testnet"' >> ~/env; \
#    fi

# Allow Communications:
#         p2p mainnet   rpc mainnet   p2p testnet   rpc testnet    p2p regtest    rpc regtest 
#EXPOSE    12024/tcp     14022/tcp     12026/tcp     14023/tcp      18444/tcp      18443/tcp

#         Flux API
EXPOSE    16127/tcp

#         Rosetta Online HTTP Node
EXPOSE    $ONLINE_PORT/tcp

#         Rosetta Offline HTTP Node
EXPOSE    $OFFLINE_PORT/tcp

# Create symlinks shouldn't be needed as they're installed in /usr/local/bin/
#RUN ln -s /usr/local/bin/digibyted /usr/bin/digibyted
#RUN ln -s /usr/local/bin/digibyte-cli /usr/bin/digibyte-cli

COPY docker-entrypoint.sh "${ROOTDATADIR}/docker_entrypoint.sh"

RUN npm install -g concurrently

ENTRYPOINT ["./docker_entrypoint.sh"]
