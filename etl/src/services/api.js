const cennznetApi = require('@cennznet/api');
const cennznetGenericAsset = require('@cennznet/crml-generic-asset');

let api, ga;


async function connect({ provider: uri }) {
    if (api) {
        return;
    }
    try {
        api = await cennznetApi.Api.create({ provider: uri });

        const [chain, nodeName, nodeVersion] = await Promise.all([
            api.rpc.system.chain(),
            api.rpc.system.name(),
            api.rpc.system.version()
        ]);

        console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
    } catch (e) {
        process.exitCode = 1;
        console.error(e.stack);
        throw new Error('Connection to node failed');
    }

    ga = await new cennznetGenericAsset.GenericAsset(api);

}

async function getBlock(n) {
    const hash = n ? await api.rpc.chain.getBlockHash(n) : await api.rpc.chain.getBlockHash();
    return api.rpc.chain.getBlock(hash).then((r) => r.block);
}

async function getEvents(blockHash) {
    return api.query.system.events(blockHash);
}

async function getBlockFee(blockHash) {
    // const [baseFee, byteFee, transferFee] = await Promise.all([
    //     api.query.fees.feeRegistry(blockHash, cennznetTypes.Fee.FeesFee.BaseFee),
    //     api.query.fees.feeRegistry(blockHash, Fee.FeesFee.BytesFee),
    //     api.query.fees.feeRegistry(blockHash, Fee.GenericAssetFee.TransferFee),
    // ]);

    const baseFee = 0, byteFee = 0, transferFee = 0;
    return { baseFee, byteFee, transferFee };
}

async function getBalance(
    assetId,
    address,
    blockHash,
){
    const [free, reserved] = await Promise.all([
        getFreeBalance(assetId, address, blockHash),
        getReservedBalance(assetId, address, blockHash),
    ]);
    return { free, reserved };
}

async function getFreeBalance(
    assetId,
    address,
    blockHash,
) {
    return blockHash
        ? ga.getFreeBalance
              (blockHash, assetId.toString(), address)
              .then(balance => balance.toString())
        : ga.getFreeBalance(assetId.toString(), address).then(balance => balance.toString());
}

async function getReservedBalance(
    assetId,
    address,
    blockHash
) {
    return blockHash
        ? ga.getReservedBalance
              (blockHash, assetId.toString(), address)
              .then(balance => balance.toString())
        : ga.getReservedBalance(assetId.toString(), address).then(balance => balance.toString());
}

async function getValidators(blockHash) {
    return api.query.session.validators(blockHash);
}

async function getSessionInfo(blockHash, blockNumber) {
    // const [
    //     rsessionLength,
    //     lastLengthChangeOpt,
    //     CurrentIndex,
    //     lastEraLengthChange,
    //     sessionsPerEra,
    // ] = await Promise.all([
    //     api.query.session.sessionLength(blockHash),
    //     api.query.session.lastLengthChange(blockHash),
    //     api.query.session.currentIndex(blockHash),
    //     api.query.staking.lastEraLengthChange(blockHash),
    //     api.query.staking.sessionsPerEra(blockHash),
    // ]);
    const sessionLength = 0, lastLengthChange = 0, eraProgress = 0, eraLength = 0;
    const CurrentIndex = api.query.session.currentIndex(blockHash);
    // const sessionLength = rsessionLength.toNumber();
    // const lastLengthChange = lastLengthChangeOpt.unwrapOr(0);
    const sessionProgress =
        (blockNumber - lastLengthChange + sessionLength) % sessionLength;
    // const eraProgress =
    //     ((CurrentIndex.toNumber() - lastEraLengthChange.toNumber()) % sessionsPerEra.toNumber()) *
    //         sessionLength +
    //     sessionProgress;
    // const eraLength = sessionLength * sessionsPerEra.toNumber();
    return { sessionProgress, sessionLength, eraProgress, eraLength };
}

async function getSpendingAssetId(blockHash) {
    return api.query.genericAsset.spendingAssetId(blockHash).then(r => r.toString());
}

async function getByteCode(address) {
    const codeHash = await api.query.contract.contractInfoOf(address);
    const result = await api.query.contract.codeStorage(codeHash.value.asAlive.codeHash.toString());
    return JSON.parse(result.toString());
}

async function getStakingAssetId(blockHash) {
    return api.query.genericAsset.stakingAssetId(blockHash).then(r => r.toString());
}


module.exports = {getByteCode, connect, getBlock, getBlockFee, getBalance, getSpendingAssetId, getStakingAssetId, getSessionInfo, getValidators, getReservedBalance, getFreeBalance, getEvents};
