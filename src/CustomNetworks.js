/* DigiByte Networks Params for Bitcore-lib */

const mainnet = {
  name: 'flux_mainnet',
  bech32prefix: 'dgb',
  pubkeyhash: 0x1e,
  privatekey: 0x80,
  privatekeyOld: 0x9e,
  scripthash: 0x3f,
  scripthashTwo: 0x05,
  xpubkey: 0x0488b21e,
  xprivkey: 0x0488ade4,
  networkMagic: 0x24e92764,
  port: 12024,
  dnsSeeds: [
    'seed.digibyte.co',
    'seed.digibyte.io',
    'digiexplorer.info',
  ],
};

const livenet = {
  name: 'dgb_livenet',
  alias: 'dgb_mainnet',
  bech32prefix: 'dgb',
  pubkeyhash: 0x1e,
  privatekey: 0x80,
  privatekeyOld: 0x9e,
  scripthash: 0x3f,
  scripthashTwo: 0x05,
  xpubkey: 0x0488b21e,
  xprivkey: 0x0488ade4,
  networkMagic: 0xfac3b6da,
  port: 12024,
  dnsSeeds: [
    'seed.digibyte.co',
    'seed.digibyte.io',
    'digiexplorer.info',
  ],
};

const testnet = {
  name: 'dgb_testnet',
  alias: 'dgb_testnet',
  bech32prefix: 'dgbt',
  pubkeyhash: 0x7e,
  privatekey: 0xfe,
  scripthash: 0x8c,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
};

const regtest = {
  name: 'dgb_regtest',
  alias: 'dgb_regtest',
  bech32prefix: 'dgbrt',
  pubkeyhash: 0x7e,
  privatekey: 0xfe,
  scripthash: 0x8c,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
};

module.exports = {
  livenet,
  testnet,
  regtest,
  mainnet,
};
