const apiService = require('../../services/api');
const utils = require('../../utils');

function txHandler(task, raw) {
    const { events, block } = raw;

    for (const [idx, ex] of block.extrinsics.entries()) {
        const exType = utils.getExtrinsicType(ex);
        if (exType !== 'genericAsset.transfer') {
            continue;
        }

        const size = ex.toU8a().byteLength;
        const gaStatus = events.find(
            e =>
                utils.getEventType(e) === 'system.ExtrinsicSuccess' &&
                parseFloat(e.phase.value.toString()) === idx,
        );
        const txn = {
            hash: ex.hash.toString(),
            block_number: task.block.number,
            block_hash: task.block.hash,
            from_address: ex.signature.signer.toString(),
            to_address: ex.args[1].toString(),
            value: ex.args[2].toString(),
            fee: events
                .find(
                    e =>
                        utils.getEventType(e) === 'fees.Charged' &&
                        parseFloat(e.event.data[0].toString()) === idx,
                )
                .event.data[1].toString(),
            nonce: parseFloat(ex.signature.nonce),
            size,
            status: !!gaStatus,
            timestamp: task.block.timestamp,
            asset_idd: parseFloat(ex.args[0].toString()),
            gas_limit: null,
            index: idx,
            type: 'Standard',
            data: null,
        };
        task.addTransaction(txn);
    }
}


module.exports = txHandler;
