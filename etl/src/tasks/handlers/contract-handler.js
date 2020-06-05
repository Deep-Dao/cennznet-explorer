const apiService = require('../../services/api');
const utils = require('../../utils');

async function contractHandler(task, raw) {
    const { block, events, spendingAssetId } = raw;
    const filtered = raw.events.filter(e => utils.getEventType(e) === 'contract.Instantiated');
    const byteCodes = await Promise.all(
        filtered.map(e => apiService.getByteCode(e.event.data[1])),
    );

    for (const i in filtered) {
        const e = filtered[i];
        const idx = e.phase.value.toString();
        const ex = block.extrinsics[idx];
        const contract = {
            address: e.event.data[1].toString(),
            block_number: task.block.number,
            timestamp: task.block.timestamp,
            endowment: ex.args[0].toString(),
            gas_limit: ex.args[1].toString(),
            code_hash: ex.args[2].toString(),
            data: ex.args[3].toString(),
            creator: e.event.data[0].toString(),
            byte_code: byteCodes[i],
            fee: raw.events
                .find(
                    E =>
                        utils.getEventType(E) === 'fees.Charged' &&
                        E.event.data[0].toString() === idx,
                )
                .event.data[1].toString(),
            name: null,
        };
        task.addContract(contract);
    }

    for (const [idx, ex] of block.extrinsics.entries()) {
        const exType = apiService.getExtrinsicType(ex);
        if (exType !== 'contract.call') {
            continue;
        }
        const size = ex.toU8a().byteLength;
        const transfertEvent = events.find(
            e =>
                utils.getEventType(e) === 'contract.Transfer' &&
                Number(e.phase.value.toString()) === idx,
        );
        const txn = {
            hash: ex.hash.toString(),
            block_number: task.block.number,
            block_hash: task.block.hash,
            from_address: ex.signature.signer.toString(),
            to_address: ex.args[0].toString(),
            value: ex.args[1].toString(),
            fee: events
                .find(
                    e =>
                        utils.getEventType(e) === 'fees.Charged' &&
                        parseFloat(e.event.data[0].toString()) === idx,
                )
                .event.data[1].toString(),
            nonce: parseFloat(ex.signature.nonce),
            size,
            status: !!transfertEvent,
            timestamp: task.block.timestamp,
            asset_id: spendingAssetId,
            gas_limit: parseFloat(ex.args[2].toString()),
            index: idx,
            type: TransactionType.Contract,
            data: ex.args[3].toString(),
        };
        task.addTransaction(txn);

        for (const [traceIdx, e] of events
            .filter(E => parseFloat(E.phase.value.toString()) === idx)
            .entries()) {
            if (e === transfertEvent || utils.getEventType(e) !== 'contract.Transfer') {
                continue;
            }
            task.addTrace({
                    transaction_hash: txn.hash,
                    from_address: e.event.data[0].toString(),
                    to_address: e.event.data[1].toString(),
                    value: e.event.data[2].toString(),
                    asset_id: spendingAssetId,
                    block_number: task.block.number,
                    timestamp: task.block.timestamp,
                    index: traceIdx,
                    block_hash: task.block.hash,
                });
        }
    }
}

module.exports = contractHandler;