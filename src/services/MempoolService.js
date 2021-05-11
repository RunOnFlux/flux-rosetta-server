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

const Types = RosettaSDK.Client;

const rpc = require('../rpc');
const utils = require('../utils');
const Errors = require('../../config/errors');

/* Data API: Mempool */

/**
* Get All Mempool Transactions
* Get all Transaction Identifiers in the mempool
*
* mempoolRequest MempoolRequest
* returns MempoolResponse
* */
const mempool = async (params) => {
  // eslint-disable-next-line no-unused-vars
  const { mempoolRequest } = params;

  try {
    const mempoolResponse = await rpc.getRawMemPoolAsync(true);
    const mempool = mempoolResponse.result;

    if (!mempool) {
      throw Errors.UNABLE_TO_FETCH_MEMPOOL_TXS;
    }

    const txIds = Object.keys(mempool);
    return new Types.MempoolResponse(txIds);
  } catch (e) {
    console.error(e);
    throw Errors.UNABLE_TO_FETCH_MEMPOOL_TXS;
  }
};

/**
* Get a Mempool Transaction
* Get a transaction in the mempool by its Transaction Identifier. This is a separate request than fetching a block transaction (/block/transaction) because some blockchain nodes need to know that a transaction query is for something in the mempool instead of a transaction in a block.  Transactions may not be fully parsable until they are in a block (ex: may not be possible to determine the fee to pay before a transaction is executed). On this endpoint, it is ok that returned transactions are only estimates of what may actually be included in a block.
*
* mempoolTransactionRequest MempoolTransactionRequest
* returns MempoolTransactionResponse
* */
const mempoolTransaction = async (params) => {
  const { mempoolTransactionRequest } = params;

  try {
    const txId = mempoolTransactionRequest.transaction_identifier.hash;
    const mempoolTransactionResponse = await rpc.getRawTransactionAsync(txId, 1);
    const mempoolTx = mempoolTransactionResponse.result;

    if (!mempool) {
      throw Errors.UNABLE_TO_FETCH_MEMPOOL_TX;
    }

    return utils.transactionToRosettaType(mempoolTx, true);
  } catch (e) {
    console.log(e);
    throw Errors.UNABLE_TO_FETCH_MEMPOOL_TX;
  }
};

module.exports = {
  /* /mempool */
  mempool,

  /* /mempool/transaction */
  mempoolTransaction,
};
