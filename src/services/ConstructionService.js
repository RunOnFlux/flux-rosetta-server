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

const {
  Address,
  PublicKey,
  Networks,
  Script,
} = require('bitcore-lib-zelcash');

const bitcoin = require('bitgo-utxo-lib');
const templates = require('bitgo-utxo-lib/src/templates/index');
var reverseInplace = require("buffer-reverse/inplace")

const config = require('../../config');
const CustomNetworks = require('../CustomNetworks');
const Network = CustomNetworks[config.network];
const BitGoNetwork = CustomNetworks.bitgo[config.network];

const rpc = require('../rpc');
const Errors = require('../../config/errors');
const ChainIndexer = require('../chainIndexer');
const networkIdentifier = require('../../config/networkIdentifier');

const Types = RosettaSDK.Client;

Networks.add(Network);
Networks.defaultNetwork = Network.name;

/* Construction API */

/**
* Get Transaction Construction Metadata
* Get any information required to construct a transaction for a specific network. Metadata returned here could be a recent hash to use, an account sequence number, or even arbitrary chain state. It is up to the client to correctly populate the options object with any network-specific details to ensure the correct metadata is retrieved.  It is important to clarify that this endpoint should not pre-construct any transactions for the client (this should happen in the SDK). This endpoint is left purposely unstructured because of the wide scope of metadata that could be required.  In a future version of the spec, we plan to pass an array of Rosetta Operations to specify which metadata should be received and to create a transaction in an accompanying SDK. This will help to insulate the client from chain-specific details that are currently required here.
*
* constructionMetadataRequest ConstructionMetadataRequest
* returns ConstructionMetadataResponse
* */
const constructionMetadata = async (params) => {
  const { constructionMetadataRequest } = params;
  const { options } = constructionMetadataRequest;

  if (!options || !Array.isArray(options.required_balances) ||
    options.required_balances.length == 0) throw Errors.EXPECTED_REQUIRED_ACCOUNTS;

  const relevantInputs = [];
  let change = 0;

  for (let requiredBalance of options.required_balances) {
    const { amount } = requiredBalance;
    if (amount.sats < 0) {
      // We now assume that the pre-processed list of operations
      // has picked out the inputs we want to use in this transaction.
      for (let coin of amount.coins) {
        const res = coin.split(':')
        relevantInputs.push({
          txid: res[0],
          vout: parseInt(res[1]),
        })
      }
    }
  }

  // Return the metadata to work with
  // TODO: Fee calculation
  return Types.ConstructionMetadataResponse.constructFromObject({
    metadata: {
      relevant_inputs: relevantInputs,
      change,
    },
    suggested_fee: [new Types.Amount(50000, config.serverConfig.currency)],
  });
};

/**
* Submit a Signed Transaction
* Submit a pre-signed transaction to the node. This call should not block on the transaction being included in a block. Rather, it should return immediately with an indication of whether or not the transaction was included in the mempool.  The transaction submission response should only return a 200 status if the submitted transaction could be included in the mempool. Otherwise, it should return an error.
*
* constructionSubmitRequest ConstructionSubmitRequest
* returns ConstructionSubmitResponse
* */
const constructionSubmit = async (params) => {
  const { constructionSubmitRequest } = params;

  const tx = Buffer.from(constructionSubmitRequest.signed_transaction, 'hex');
  const decodedTx = JSON.parse(tx.toString());

  const signedTransaction = decodedTx.transaction;
  try {
    const hash = await rpc.sendRawTransactionAsync(signedTransaction);
    return new Types.TransactionIdentifierResponse(new Types.TransactionIdentifier(hash.result));
  } catch (e) {
    console.error(e);
    throw Errors.UNABLE_TO_SUBMIT_BLOCK;
  }
};

/**
* Create Network Transaction from Signatures
* Combine creates a network-specific transaction from an unsigned transaction and an array of provided signatures. The signed transaction returned from this method will be sent to the `/construction/submit` endpoint by the caller.
*
* constructionCombineRequest ConstructionCombineRequest
* returns ConstructionCombineResponse
* */
const constructionCombine = async (params) => {
  const { constructionCombineRequest } = params;

  const unsignedTransaction = constructionCombineRequest.unsigned_transaction;

  var tx = Buffer.from(unsignedTransaction, 'hex');
  var decodedTx = JSON.parse(tx.toString());

  const transaction = new bitcoin.Transaction.fromHex(decodedTx.transaction, BitGoNetwork);

  const txb = new bitcoin.TransactionBuilder(BitGoNetwork);
  // TODO: Move these into the config files
  txb.setVersion(4, true);
  txb.setVersionGroupId(parseInt("0x892f2085", 16));

  for (let outputIndex in transaction.outs) {
    var output = transaction.outs[outputIndex];
    txb.addOutput(output.script, output.value);
  }
  for (let inputIndex in transaction.ins) {
    var input = transaction.ins[inputIndex];
    txb.addInput(input.hash, input.index);
  }
  for (let inputIndex in transaction.ins) {
    input = transaction.ins[inputIndex];
    txb.inputs[inputIndex].prevOutType = templates.types.P2PKH;
    
    const pkData = constructionCombineRequest.signatures[inputIndex].public_key.hex_bytes;
    const fullsig = constructionCombineRequest.signatures[inputIndex].hex_bytes;
    txb.inputs[inputIndex].signatures = [Buffer.from(fullsig,'hex')];
    txb.inputs[inputIndex].pubKeys = [Buffer.from(pkData,'hex')];
  }

  var response = {
    transaction: txb.build().toHex(),
    inputAmounts: decodedTx.inputAmounts
  };

  return new Types.ConstructionCombineResponse(Buffer.from(JSON.stringify(response)).toString('hex'));
};

/**
* Derive an Address from a PublicKey
* Derive returns the network-specific address associated with a public key. Blockchains that require an on-chain action to create an account should not implement this method.
*
* constructionDeriveRequest ConstructionDeriveRequest
* returns ConstructionDeriveResponse
* */
const constructionDerive = async (params) => {
  const { constructionDeriveRequest } = params;
  const { public_key, network_identifier } = constructionDeriveRequest;

  if (public_key.curve_type != 'secp256k1') {
    return Errors.INVALID_CURVE_TYPE;
  }

  try {
    const pubKey = new PublicKey(public_key.hex_bytes);
    const address = Address.fromPublicKey(pubKey, networkIdentifier.network); // , undefined, 'witnesspubkeyhash');
    return new Types.ConstructionDeriveResponse(new Types.AccountIdentifier(address.toString()));

  } catch (e) {
    console.error(e);
    return Errors.UNABLE_TO_DERIVE_ADDRESS.addDetails({ reason: e.message });
  }
};

/**
* Get the Hash of a Signed Transaction
* TransactionHash returns the network-specific transaction hash for a signed transaction.
*
* constructionHashRequest ConstructionHashRequest
* returns TransactionIdentifierResponse
* */
const constructionHash = async (params) => {
  const { constructionHashRequest } = params;

  const tx = Buffer.from(constructionHashRequest.signed_transaction, 'hex');
  const decodedTx = JSON.parse(tx.toString());

  const signedTransaction = decodedTx.transaction;
  const transaction = new bitcoin.Transaction.fromHex(signedTransaction, BitGoNetwork);

  return new Types.TransactionIdentifierResponse(new Types.TransactionIdentifier(transaction.getHash().toString('hex')));
};

/**
* Parse a Transaction
* Parse is called on both unsigned and signed transactions to understand the intent 
* of the formulated transaction. This is run as a sanity check before signing 
* (after `/construction/payloads`) and before broadcast (after `/construction/combine`).
*
* constructionParseRequest ConstructionParseRequest
* returns ConstructionParseResponse
* */
const constructionParse = async (params) => {
  const { constructionParseRequest } = params;

  if (constructionParseRequest.signed) {
    return await parseSignedTransaction(constructionParseRequest);
  } else {
    return await parseUnsignedTransaction(constructionParseRequest);
  }
};

const parseUnsignedTransaction = async (request) => {
  var tx = Buffer.from(request.transaction, 'hex');
  var decodedTx = JSON.parse(tx.toString());

  const transaction = new bitcoin.Transaction.fromHex(decodedTx.transaction, BitGoNetwork);

  var ops = [];
  var index = 0;
  for (let input of transaction.ins) {
    ops.push(Types.Operation.constructFromObject({
      operation_identifier: Types.OperationIdentifier.constructFromObject({
        index: ops.length,
        network_index: index
      }),
      type: config.serverConfig.operationTypes.INPUT,
      account: new Types.AccountIdentifier(decodedTx.inputAddresses[index]),
      amount: new Types.Amount(decodedTx.inputAmounts[index], config.serverConfig.currency),
      coin_change: new Types.CoinChange(
        new Types.CoinIdentifier(reverseInplace(input.hash).toString('hex')+":"+input.index),
        new Types.CoinAction().spent
      )
    }));
    index++;
  }

  for (let output of transaction.outs) {
    ops.push(Types.Operation.constructFromObject({
      operation_identifier: Types.OperationIdentifier.constructFromObject({
        index: ops.length,
        network_index: index
      }),
      type: config.serverConfig.operationTypes.OUTPUT,
      account: new Types.AccountIdentifier(bitcoin.address.fromOutputScript(output.script, BitGoNetwork).toString()),
      amount: new Types.Amount(output.value, config.serverConfig.currency),
    }));
    index++;
  }

  return new Types.ConstructionParseResponse(ops);
}

const parseSignedTransaction = async (request) => {
  var tx = Buffer.from(request.transaction, 'hex');
  var decodedTx = JSON.parse(tx.toString());

  const transaction = new bitcoin.Transaction.fromHex(decodedTx.transaction, BitGoNetwork);

  var ops = [];
  var index = 0;
  var account_identifier_signers = [];
  var signers = [];

  for (let input of transaction.ins) {
    var decompiledScript = bitcoin.script.decompile(input.script);
    var pk = new PublicKey(decompiledScript[1]);
    account_identifier_signers.push(new Types.AccountIdentifier(pk.toAddress().toString()));
    signers.push(pk.toAddress().toString());
  
    ops.push(Types.Operation.constructFromObject({
      operation_identifier: Types.OperationIdentifier.constructFromObject({
        index: ops.length,
        network_index: index
      }),
      type: config.serverConfig.operationTypes.INPUT,
      account: new Types.AccountIdentifier(pk.toAddress().toString()),
      amount: new Types.Amount(decodedTx.inputAmounts[index], config.serverConfig.currency),
      coin_change: new Types.CoinChange(
        new Types.CoinIdentifier(reverseInplace(input.hash).toString('hex')+":"+input.index),
        new Types.CoinAction().spent
      )
    }));
    index++;
  }

  for (let output of transaction.outs) {
    ops.push(Types.Operation.constructFromObject({
      operation_identifier: Types.OperationIdentifier.constructFromObject({
        index: ops.length,
        network_index: index
      }),
      type: config.serverConfig.operationTypes.OUTPUT,
      account: new Types.AccountIdentifier(bitcoin.address.fromOutputScript(output.script, BitGoNetwork).toString()),
      amount: new Types.Amount(output.value, config.serverConfig.currency),
    }));
    index++;
  }

  return Types.ConstructionParseResponse.constructFromObject({
    "operations": ops,
    "account_identifier_signers": account_identifier_signers,
    "signers": signers
  });
}

/**
* Generate an Unsigned Transaction and Signing Payloads
* Payloads is called with an array of operations and the response from `/construction/metadata`. It returns an unsigned transaction blob and a collection of payloads that must be signed by particular addresses using a certain SignatureType. The array of operations provided in transaction construction often times can not specify all \"effects\" of a transaction (consider invoked transactions in Ethereum). However, they can deterministically specify the \"intent\" of the transaction, which is sufficient for construction. For this reason, parsing the corresponding transaction in the Data API (when it lands on chain) will contain a superset of whatever operations were provided during construction.
*
* constructionPayloadsRequest ConstructionPayloadsRequest
* returns ConstructionPayloadsResponse
* */
const constructionPayloads = async (params) => {
  const { constructionPayloadsRequest } = params;
  const { operations, metadata } = constructionPayloadsRequest;

  if (!metadata || !Array.isArray(metadata.relevant_inputs) ||
    metadata.relevant_inputs.length == 0) throw Errors.EXPECTED_RELEVANT_INPUTS;

  const transaction = new bitcoin.TransactionBuilder(BitGoNetwork);
  // TODO: Move these into the config files
  transaction.setVersion(4, true);
  transaction.setVersionGroupId(parseInt("0x892f2085", 16));

  var inputAddresses = [];
  var inputAmounts = [];

  var i = 0;
  for (let operation of operations) {
    if (operation.type == config.serverConfig.operationTypes.INPUT) {
      inputAddresses[i] = operation.account.address;
      inputAmounts[i] = parseInt(operation.amount.value);
      metadata.relevant_inputs[i].satoshis = Math.abs(parseInt(operation.amount.value));
      metadata.relevant_inputs[i].script = Script.fromAddress(operation.account.address).toHex();
      i++;
    }
  }

  i = 0;
  for (let operation of operations) {
    if (operation.type == config.serverConfig.operationTypes.OUTPUT) {
      transaction.addOutput(operation.account.address, parseInt(operation.amount.value));
    } else if (operation.type == config.serverConfig.operationTypes.INPUT) {
      inputAddresses[i] = operation.account.address;
      inputAmounts[i] = parseInt(operation.amount.value);
      i++;
    }
  }

  var payloads = [];
  i = 0;
  for (let input of metadata.relevant_inputs) {
    transaction.addInput(input.txid, input.vout);
    const sigHash = transaction.tx.hashForZcashSignature(i,
                                                         Buffer.from(input.script,'hex'),
                                                         Math.abs(inputAmounts[i]),
                                                         bitcoin.Transaction.SIGHASH_ALL).toString('hex');
    payloads.push(Types.SigningPayload.constructFromObject({
      address: inputAddresses[i],
      account_identifier: {
        address: inputAddresses[i],
      },
      hex_bytes: sigHash,
      signature_type: 'ecdsa',
    }));
    i++
  }

  var incompleteTransaction = transaction.buildIncomplete().toHex();

  var unsignedTransaction = {
    transaction: incompleteTransaction,
    inputAddresses: inputAddresses,
    inputAmounts: inputAmounts,
  };

  return new Types.ConstructionPayloadsResponse(
    Buffer.from(JSON.stringify(unsignedTransaction)).toString('hex'), 
    payloads);
};

/**
* Create a Request to Fetch Metadata
* Preprocess is called prior to `/construction/payloads` to construct a request for any metadata that is needed for transaction construction given (i.e. account nonce). The request returned from this method will be used by the caller (in a different execution environment) to call the `/construction/metadata` endpoint.
*
* constructionPreprocessRequest ConstructionPreprocessRequest
* returns ConstructionPreprocessResponse
* */
const constructionPreprocess = async (params) => {
  const { constructionPreprocessRequest } = params;
  const { operations } = constructionPreprocessRequest;

  const requiredAmountForAccount = {};
  const requiredBalances = [];


  for (let operation of operations) {
    const { address } = operation.account;
    const amount = parseInt(operation.amount.value);

    // Skip if receiving address.
    if (amount >= 0) continue;
    
    if (operation.type == config.serverConfig.operationTypes.OUTPUT) {
      throw Errors.INVALID_OUTPUT_OPERATION;
    }

    /**
     * Group the required amount to the relevant account.
     */
    requiredAmountForAccount[address] = requiredAmountForAccount[address] || { sats: 0, coins: [] };
    requiredAmountForAccount[address].sats += amount;
    requiredAmountForAccount[address].coins.push(operation.coin_change.coin_identifier.identifier);
  }

  for (let account of Object.keys(requiredAmountForAccount)) {
    requiredBalances.push({
      account, 
      amount: requiredAmountForAccount[account]
    });
  }

  return new Types.ConstructionPreprocessResponse({
      required_balances: requiredBalances,
  })

};

module.exports = {
  /* /construction/metadata */
  constructionMetadata,

  /* /construction/submit */
  constructionSubmit,

  /* /construction/combine */
  constructionCombine,

  /* /construction/derive */
  constructionDerive,

  /* /construction/hash */
  constructionHash,

  /* /construction/parse */
  constructionParse,

  /* /construction/payloads */
  constructionPayloads,

  /* /construction/preprocess */
  constructionPreprocess,
};
