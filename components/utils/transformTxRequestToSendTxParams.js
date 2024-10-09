"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformTxRequestToSendTxParams = void 0;
var transformTxRequestToSendTxParams = function (account, txRequest) {
    if (!txRequest) {
        throw new Error("transformTxRequestToSendTx: A transaction request was not provided");
    }
    return {
        to: txRequest.to,
        account: account,
        data: txRequest.data,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
        gasPrice: txRequest.gasPrice
            ? BigInt(txRequest.gasPrice)
            : undefined,
        chain: null,
    };
};
exports.transformTxRequestToSendTxParams = transformTxRequestToSendTxParams;
