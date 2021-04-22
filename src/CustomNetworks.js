/* DigiByte Networks Params for Bitcore-lib */

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

module.exports = {
  mainnet,
  testnet,
};
