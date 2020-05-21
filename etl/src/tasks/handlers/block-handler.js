const utils = require('../../utils');

function blockHandler(task, raw) {
    const { header, extrinsics } = raw.block;
    task.block = {
        number: header.blockNumber.toNumber(),
        hash: header.hash.toString(),
        parentHash: header.parentHash.toString(),
        stateRoot: header.stateRoot.toString(),
        extrinsicsRoot: header.extrinsicsRoot.toString(),
        timestamp: parseFloat(extrinsics[0].args[0]),
        transactionCount: 0,
        baseFee: parseFloat(raw.blockFee.baseFee),
        byteFee: parseFloat(raw.blockFee.byteFee),
        transferFee: parseFloat(raw.blockFee.transferFee),
        // author: extHeader.author.toString(),
        extrinsicCount: extrinsics.length,
    };
}

module.exports = blockHandler;
