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
            blockNumber: task.block.number,
            timestamp: task.block.timestamp,
            endowment: ex.args[0].toString(),
            gasLimit: ex.args[1].toString(),
            codeHash: ex.args[2].toString(),
            data: ex.args[3].toString(),
            creator: e.event.data[0].toString(),
            byteCode: byteCodes[i],
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
        const exType = utils.getExtrinsicType(ex);
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
            blockNumber: task.block.number,
            blockHash: task.block.hash,
            fromAddress: ex.signature.signer.toString(),
            toAddress: ex.args[0].toString(),
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
            assetId: spendingAssetId,
            gasLimit: parseFloat(ex.args[2].toString()),
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
                    transactionHash: txn.hash,
                    fromAddress: e.event.data[0].toString(),
                    toAddress: e.event.data[1].toString(),
                    value: e.event.data[2].toString(),
                    assetId: spendingAssetId,
                    blockNumber: task.block.number,
                    timestamp: task.block.timestamp,
                    index: traceIdx,
                    blockHash: task.block.hash,
                });
        }
    }
}

module.exports = contractHandler;
