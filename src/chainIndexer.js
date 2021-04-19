const config = require('../config');
const Indexer = require('./Indexer');

const chainIndexer = new Indexer(config.data);
module.exports = chainIndexer;
