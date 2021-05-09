const RosettaSDK = require('rosetta-node-sdk');

const Types = RosettaSDK.Client;

const Blockchain = 'flux';
const Network = process.env.FLUX_NETWORK || 'mainnet';
const networkIdentifier = new Types.NetworkIdentifier(Blockchain, Network);

module.exports = networkIdentifier;
