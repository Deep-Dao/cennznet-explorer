const apiService = require('../../services/api');
const utils = require('../../utils');
const {isEmpty} = require('lodash');

async function txHandler(task, raw) {
    const { events, block } = raw;

    for (const [idx, ex] of block.extrinsics.entries()) {
        const exType = await apiService.getExtrinsicType(ex);
        if (exType !== 'genericAsset.transfer') {
            continue;
        }

        const size = ex.toU8a().byteLength;
        const gaStatus = events.find(
            e =>
                utils.getEventType(e) === 'system.ExtrinsicSuccess' &&
                parseFloat(e.phase.value.toString()) === idx,
        );
        const nonce = parseFloat(ex.signature.nonce);

        const txn = {
            hash: ex.hash.toString(),
            block_number: task.block.number,
            block_hash: task.block.hash,
            from_address: ex.signer.toString(),
            to_address: ex.args[1].toString(),
            value: ex.args[2].toString(),
            fee: 0,
            nonce: isNaN(nonce) ? 0 : nonce,
            size,
            status: !!gaStatus,
            timestamp: task.block.timestamp,
            asset_id: parseFloat(ex.args[0].toString()),
            gas_limit: null,
            index: idx,
            type: 'Standard',
            data: null,
        };
        task.addTransaction(txn);
    }
}


module.exports = txHandler;
