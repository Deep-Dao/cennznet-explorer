const utils = require('../../utils');

async function assetHandler(task, raw) {
    const { block, events } = raw;

    for (const e of events) {
        if (utils.getEventType(e) !== 'genericAsset.Created') {
            continue;
        }
        const idx = e.phase.value.toString();
        const ex = block.extrinsics[idx];

        const assetId = parseFloat(e.event.data[0].toString());
        let type;
        if (assetId >= 0 && assetId < 16000) {
            type = 'Reserved';
        } else if (assetId >= 16000 && assetId < 17000) {
            type = 'Test';
        } else if (assetId >= 17000) {
            type = 'User-generated';
        } else {
            type = null;
        }
        task.addNewAsset(
            {
                hash: ex.hash.toString(),
                id: assetId,
                initial_issuance: e.event.data[2].toJSON().initialIssuance.toString(),
                block_number: task.block.number,
                timestamp: task.block.timestamp,
                symbol: type === AssetType.UserGenerated ? 'ASSET-' + assetId : null,
                creator: ex.signature.signer.toString(),
                fee: events
                    .find(
                        E =>
                            utils.getEventType(E) === 'fees.Charged' &&
                            E.event.data[0].toString() === idx,
                    )
                    .event.data[1].toString(),
                type,
            },
        );
    }
}

module.exports = assetHandler;
