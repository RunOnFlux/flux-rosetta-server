/* Flux Networks Params for Bitcore-lib and bitgo-utxo-lib */
const bitcoin = require('bitgo-utxo-lib');

const mainnet = {
  name: 'flux_mainnet',
  pubkeyhash: 0x1cb8,
  privatekey: 0x80,
  scripthash: 0x1cbd,
  xpubkey: 0x0488b21e,
  xprivkey: 0x0488ade4,
  zaddr: 0x169a,
  zkey: 0xab36,
  networkMagic: 0x24e92764,
  port: 19332,
  dnsSeeds: [
    'dnsseed.runonflux.io',
  ],
};

const testnet = {
  name: 'flux_testnet',
  pubkeyhash: 0x1d25,
  privatekey: 0xef,
  scripthash: 0x1cba,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  zaddr: 0x16b6,
  zkey: 0xac08,
};

const hashFunctions = {
  address: bitcoin.crypto.hash256, // sha256x2
  transaction: bitcoin.crypto.hash256 // sha256x2
}

const bitgo_mainnet = {
  messagePrefix: '\x18ZelCash Signed Message:\n',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x1cb8,
  scriptHash: 0x1cbd,
  wif: 0x80,
  // This parameter was introduced in version 3 to allow soft forks, for version 1 and 2 transactions we add a
  // dummy value.
  consensusBranchId: {
    1: 0x00,
    2: 0x00,
    3: 0x5ba81b19,
    4: 0x76b809bb
  },
  coin: bitcoin.coins.ZEC,
  hashFunctions: hashFunctions
};

const bitgo_testnet = {
  messagePrefix: '\x18ZelCash Signed Message:\n',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0x1d25,
  scriptHash: 0x1cba,
  wif: 0x80,
  // This parameter was introduced in version 3 to allow soft forks, for version 1 and 2 transactions we add a
  // dummy value.
  consensusBranchId: {
    1: 0x00,
    2: 0x00,
    3: 0x5ba81b19,
    4: 0x76b809bb
  },
  coin: bitcoin.coins.ZEC,
  hashFunctions: hashFunctions
};


module.exports = {
  mainnet,
  testnet,
  bitgo: {
    "mainnet": bitgo_mainnet,
    "testnet": bitgo_testnet,
  }
};
