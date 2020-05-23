const utils = require('../../utils');

function blockHandler(task, raw) {
    const { header, extrinsics } = raw.block;
    task.block = {
        number: parseInt(header.number),
        hash: header.hash.toString(),
        parent_hash: header.parentHash.toString(),
        state_root: header.stateRoot.toString(),
        extrinsics_root: header.extrinsicsRoot.toString(),
        timestamp: parseFloat(extrinsics[0].args[0]),
        transaction_count: 0,
        base_fee: parseFloat(raw.blockFee.baseFee),
        byte_fee: parseFloat(raw.blockFee.byteFee),
        transfer_fee: parseFloat(raw.blockFee.transferFee),
        author: '',
        extrinsic_count: extrinsics.length,
    };
}

module.exports = blockHandler;
