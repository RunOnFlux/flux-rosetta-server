FROM node:12-alpine
USER root
WORKDIR /data

ARG flux_version=5.0.0

RUN apk add --no-cache git make python3 py3-pip build-base bash curl

# Prepare the build process
ARG rootdatadir=/data

RUN mkdir -vp \
  "/root/rosetta-node" \
  "${rootdatadir}/utxo" \
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

# Set some environment variables
ENV ROOTDATADIR "$rootdatadir"
ENV ROSETTADIR "/root/rosetta-node"
ENV VERSION "$flux_version"
ENV ONLINE_PORT 8080
ENV OFFLINE_PORT 8081
ENV HOST 0.0.0.0
ENV RPC_USER "$rpc_username"
ENV RPC_PASS "$rpc_password"
ENV RPC_PORT 19332
ENV RPC_HOST "127.0.0.1"
ENV CONNECTION "fluxlocal"
ENV NETWORK "mainnet"

# Allow Communications:
#         Flux API
EXPOSE    16127/tcp

#         RPC
EXPOSE    $RPC_PORT/tcp

#         Rosetta Online HTTP Node
EXPOSE    $ONLINE_PORT/tcp

#         Rosetta Offline HTTP Node
EXPOSE    $OFFLINE_PORT/tcp


COPY docker-entrypoint.sh "${ROOTDATADIR}/docker_entrypoint.sh"

RUN npm install -g concurrently

ENTRYPOINT ["./docker_entrypoint.sh"]
