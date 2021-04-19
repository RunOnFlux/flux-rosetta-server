/* Singleton module for Syncer */
const config = require('../config');
const Syncer = require('./Syncer');
const ChainIndexer = require('./chainIndexer');

const ChainSyncer = new Syncer(config.syncer, ChainIndexer);
module.exports = ChainSyncer;
