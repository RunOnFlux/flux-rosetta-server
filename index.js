/**
 * Copyright (c) 2020 DigiByte Foundation NZ Limited
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const RosettaSDK = require('rosetta-node-sdk');

const Config = require('./config');
const ServiceHandlers = require('./src/services');
const ChainSyncer = require('./src/chainSyncer');
const ChainIndexer = require('./src/chainIndexer');
const rpc = require('./src/rpc');

console.log(`                                                                    
______ _             ______               _   _          _   _           _      
|  ___| |            | ___ \\             | | | |        | \\ | |         | |     
| |_  | |_   ___  __ | |_/ /___  ___  ___| |_| |_ __ _  |  \\| | ___   __| | ___ 
|  _| | | | | \\ \\/ / |    // _ \\/ __|/ _ \\ __| __/ _\` | | . \` |/ _ \\ / _\` |/ _ \\
| |   | | |_| |>  <  | |\\ \\ (_) \\__ \\  __/ |_| || (_| | | |\\  | (_) | (_| |  __/
\\_|   |_|\\__,_/_/\\_\\ \\_| \\_\\___/|___/\\___|\\__|\\__\\__,_| \\_| \\_/\\___/ \\__,_|\\___|


             Version                  ${Config.version}
             Rosetta Version          ${Config.rosettaVersion}
             Flux Node Version        ${Config.fluxVersion}
             Networks                 ${JSON.stringify(Config.serverConfig.networkIdentifiers)}
             Port                     ${Config.port}
`);

/* Create a server configuration */
const Server = new RosettaSDK.Server({
  URL_HOST: Config.host,
  URL_PORT: Config.port,
});

const asserter = RosettaSDK.Asserter.NewServer(
  Config.serverConfig.operationTypesList,
  Config.serverConfig.historicalBalanceLookup,
  Config.serverConfig.networkIdentifiers,
);

// Register global asserter
Server.useAsserter(asserter);

/* Data API: Network */
Server.register('/network/list', ServiceHandlers.Network.networkList);
Server.register('/network/options', ServiceHandlers.Network.networkOptions);
Server.register('/network/status', ServiceHandlers.Network.networkStatus);

/* Data API: Block */
Server.register('/block', ServiceHandlers.Block.block);
Server.register('/block/transaction', ServiceHandlers.Block.blockTransaction);

/* Data API: Account */
Server.register('/account/balance', ServiceHandlers.Account.balance);
Server.register('/account/coins', ServiceHandlers.Account.coins);

/* Data API: Mempool */
Server.register('/mempool', ServiceHandlers.Mempool.mempool);
Server.register('/mempool/transaction', ServiceHandlers.Mempool.mempoolTransaction);

/* Construction API */
if (Config.offline) {
  Server.register('/construction/derive', ServiceHandlers.Construction.constructionDerive); // 1
  Server.register('/construction/preprocess', ServiceHandlers.Construction.constructionPreprocess); // 2
  Server.register('/construction/payloads', ServiceHandlers.Construction.constructionPayloads); // 4
  Server.register('/construction/parse', ServiceHandlers.Construction.constructionParse); // 5, 7
  Server.register('/construction/combine', ServiceHandlers.Construction.constructionCombine); // 6
  Server.register('/construction/hash', ServiceHandlers.Construction.constructionHash); // 8
} else {
  Server.register('/construction/metadata', ServiceHandlers.Construction.constructionMetadata); // 3
  Server.register('/construction/submit', ServiceHandlers.Construction.constructionSubmit); // 9
}

/* Initialize Syncer */
const startSyncer = async () => {
  console.log(`Starting sync from height ${ChainIndexer.lastBlockSymbol + 1}...`);
  await ChainSyncer.initSyncer();

  continueSyncIfNeeded();
  return true;
};

const continueSyncIfNeeded = async () => {
  const currentHeight = ChainIndexer.lastBlockSymbol;
  const blockCountResponse = await rpc.getBlockCountAsync();
  const blockCount = blockCountResponse.result;

  if (currentHeight >= blockCount) {
    // If the sync block height equals the best block height,
    // set the syncer as synced.
    ChainSyncer.setIsSynced();
    return setTimeout(continueSyncIfNeeded, 10000);
  }

  const nextHeight = currentHeight + 1;

  // Sync the next blocks
  const syncCount = Math.min(blockCount - nextHeight, 1000);
  const targetHeight = nextHeight + syncCount;

  await ChainSyncer.sync(nextHeight, targetHeight);
  await ChainIndexer.saveState();

  setImmediate(() => {
    // Continue to sync, but using the event queue.
    // That way, the promise chain gets interrupted
    // and memory leaks are prevented.
    continueSyncIfNeeded(); // loop
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const startServer = async () => {
  Server.launch();
};

const checkConnection = async () => {
  process.stdout.write('Waiting for RPC node to be ready...');

  for (;;) {
    try {
      const response = await rpc.getBlockCountAsync();
      if (response.result == 0) throw new Error('Block height is zero');
      break;
    } catch (e) {
      await wait(30000);
      process.stdout.write('.');
    }
  }

  console.log(' RPC Node ready!');
};

const init = async () => {
  // Wait until rpc is reachable
  await checkConnection();

  // Start the REST Server
  await startServer();

  // Init the UTXO indexing service
  await ChainIndexer.initIndexer();

  // Start the UTXO indexer
  await startSyncer();
};

const initOffline = async () => {
  // Start the REST Server
  await startServer();
};

if (Config.offline) {
  console.log("Starting in offline mode...");
  initOffline().catch((e) => {
    console.error(`Could not start node in offline mode: ${e.message}`);
    console.error(e);
  });
} else {
  console.log("Starting in online mode...");
  init().catch((e) => {
    console.error(`Could not start node in online mode: ${e.message}`);
    console.error(e);
  });
}
