const RosettaSDK = require('rosetta-node-sdk');
const serverConfig = require('./serverConfig');
const crypto = require('crypto');

const DEFAULT_LISTENING_HOST = 'localhost';
const DEFAULT_ROSETTA_VERSION = '1.4.10';
const DEFAULT_RPC_PORT = 19332;
const DEFAULT_RPC_USER = 'user';
const DEFAULT_RPC_PASS = 'pass';
const DEFAULT_RPC_HOST = 'localhost';
const DEFAULT_RPC_PROTO = 'http';
const DEFAULT_LISTENING_PORT = 8080;
const DEFAULT_DATA_PATH = './data';
const DEFAULT_FLUX_NETWORK = 'mainnet';
  
/**
 * syncerSecret is used by the Indexer in order to request blocks from 
 * the listening server, that are not yet synced.
 * If the secret is not set in a request, the /block endpoint will
 * return an error (NODE_SYNCING).
 * If the secret is set, a block will be returned with an empty
 * transaction array.
 * A random secret will be used, unless the environment variable
 * SYNCER_SECRET is set.
 */
const syncerSecret = process.env.SYNCER_SECRET ||
  crypto.randomBytes(128).toString('hex');

const config = {
  version: '1.0.1',
  rosettaVersion: RosettaSDK.version || DEFAULT_ROSETTA_VERSION,
  fluxVersion: process.env.FLUX_VERSION,
  port: process.env.PORT || DEFAULT_LISTENING_PORT,
  host: process.env.HOST || DEFAULT_LISTENING_HOST,
  offline: !!parseInt(process.env.OFFLINE_MODE),

  data: {
    path: process.env.DATA_PATH || DEFAULT_DATA_PATH,
  },

  rpc: {
    rpc_port: process.env.RPC_PORT || DEFAULT_RPC_PORT,
    rpc_user: process.env.RPC_USER || DEFAULT_RPC_USER,
    rpc_pass: process.env.RPC_PASS || DEFAULT_RPC_PASS,
    rpc_host: process.env.RPC_HOST || DEFAULT_RPC_HOST,
    rpc_proto: process.env.RPC_PROTO || DEFAULT_RPC_PROTO,
  },

  network: process.env.FLUX_NETWORK || DEFAULT_FLUX_NETWORK,
  syncer: {},
  serverConfig,
};

config.syncer = {
  syncerSecret,

  defaultHeaders: {
    'syncer-secret': syncerSecret,
  },

  // Fetcher config:
  protocol: 'http',
  host: config.host,
  port: config.port,
};

if (!config.rosettaVersion) throw new Error('RosettaVersion not defined');
if (!config.fluxVersion) throw new Error('FLUX_VERSION not set');
if (!config.rpc.rpc_port) throw new Error('RPC_PORT not set');
if (!config.rpc.rpc_user) throw new Error('RPC_USER not set');
if (!config.rpc.rpc_pass) throw new Error('RPC_PASS not set');
if (!config.rpc.rpc_host) throw new Error('RPC_HOST not set');
if (!config.rpc.rpc_proto) throw new Error('RPC_PROTO not set');

module.exports = config;
