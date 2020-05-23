const utils = require('../../utils');

function attestationHandler(task, raw) {
    const { block, events } = raw;

    for (const e of events) {
        const evType = utils.getEventType(e);
        if (!['attestation.ClaimSet', 'attestation.ClaimRemoved'].includes(evType)) {
            continue;
        }
        const isClaimSet = evType === 'attestation.ClaimSet';
        const idx = e.phase.value.toString();
        const ex = block.extrinsics[idx];
        task.addAttestation(
           {
                hash: ex.hash.toString(),
                holder: e.event.data[0].toString(),
                issuer: e.event.data[1].toString(),
                topic: utils.u256ToString(e.event.data[2].toU8a()),
                value: isClaimSet ? e.event.data[3].toString() : null,
                block_number: task.block.number,
                timestamp: task.block.timestamp,
                fee: events
                    .find(
                        E =>
                            utils.getEventType(E) === 'fees.Charged' &&
                            E.event.data[0].toString() === idx,
                    )
                    .event.data[1].toString(),
                type: isClaimSet ? AttestationType.SetClaim : AttestationType.RemoveClaim,
            },
        );
    }
}

module.exports = attestationHandler;
