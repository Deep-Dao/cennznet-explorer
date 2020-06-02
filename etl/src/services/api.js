const cennznetApi = require('@cennznet/api');
const cennznetGenericAsset = require('@cennznet/crml-generic-asset');
const { Keyring } = require('@cennznet/wallet');
const { createType } = require('@cennznet/types');
const testKeyring = require('@plugnet/keyring/testing');
const fs = require('fs');
const {randomAsU8a} = require('@cennznet/util');

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

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const AMOUNT = 10000;
const FEE_ASSET_ID = 16000;
const MIN_REQUIRED_POOL_BALANCE = 1000000;
const CENNZ = 16000;

async function queryPoolBalance() {
    const [poolAssetBalance, poolCoreAssetBalance] = [
        await api.derive.cennzxSpot.poolAssetBalance(FEE_ASSET_ID),
        await api.derive.cennzxSpot.poolCoreAssetBalance(FEE_ASSET_ID),
    ];

    console.log('Pool balance: assetId: 16000, amount: ', poolAssetBalance.toString(),
        '; assetId: 16001, amount: ', poolCoreAssetBalance.toString());

    return [poolAssetBalance, poolCoreAssetBalance];
}

async function payTxFee() {
    const keyring = testKeyring.default();

    const nonce = await api.query.system.accountNonce(ALICE);

    const alicePair = keyring.getPair(ALICE);
    const bobPair = keyring.getPair(BOB);
    const recipient = keyring.addFromSeed(randomAsU8a(32)).address;

    const [poolAssetBalance, poolCoreAssetBalance] = await queryPoolBalance(api);

    if (poolCoreAssetBalance.ltn(MIN_REQUIRED_POOL_BALANCE)) {
        console.log('Pool core asset balance is lower than min requirement, adding some');
        await new Promise((resolve => {
            api.tx.cennzxSpot.addLiquidity(FEE_ASSET_ID, 0, MIN_REQUIRED_POOL_BALANCE * 2, MIN_REQUIRED_POOL_BALANCE)
                .signAndSend(bobPair, ({events = [], status}) => {
                    console.log('Transaction status:', status.type);

                    if (status.isFinalized) {
                        console.log('Completed at block hash', status.asFinalized.toHex());
                        console.log('Events:');

                        events.forEach(({phase, event: {data, method, section}}) => {
                            console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
                        });

                        resolve();
                    }
                });
        }));
        await queryPoolBalance(api);
    }

    const feeExchangeOpt = {assetId: FEE_ASSET_ID, maxPayment: '1000000000000'};
    api.tx.genericAsset
        .transfer(CENNZ, recipient, AMOUNT)
        .sign(alicePair, {nonce, feeExchange: feeExchangeOpt})
        .send(({events = [], status}) => {
            console.log('Transaction status:', status.type);

            if (status.isFinalized) {
                console.log('Completed at block hash', status.asFinalized.toHex());
                console.log('Events:');

                events.forEach(({phase, event: {data, method, section}}) => {
                    console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
                });

                process.exit(0);
            }
        });
}

async function transferWithAllowedBlock () {
    const keyring = new Keyring({ type: 'sr25519' });

    const alice = keyring.addFromUri('//Alice');

    const nonce = await api.query.system.accountNonce(alice.address);

    const signedBlock = await api.rpc.chain.getBlock();

    const currentHeight = signedBlock.block.header.number;
    const blockHash = signedBlock.block.header.hash;

    const era = createType('ExtrinsicEra', { current: currentHeight, period: 10 });

    const transfer = api.tx.genericAsset.transfer(CENNZ, BOB, 12345);

    const hash = await transfer.signAndSend(alice, { blockHash, era, nonce });

    console.log('Transfer sent with hash', hash.toHex());
}

async function transfer () {
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');
    const transfer = api.tx.genericAsset.transfer(CENNZ, BOB, 12345);
    const hash = await transfer.signAndSend(alice);

    console.log('Transfer sent with hash', hash.toHex());
}

async function balanceChangeListener () {
    console.log('Tracking balances for:', [ALICE, BOB]);

    api.query.genericAsset.freeBalance.multi([[CENNZ, ALICE], [CENNZ, BOB]], (balances) => {
        console.log('Change detected, new balances: ', balances);
    });
}

module.exports = {getByteCode, connect, getBlock, getBlockFee, getBalance, getSpendingAssetId, getStakingAssetId, getSessionInfo, getValidators, getReservedBalance, getFreeBalance, getEvents, payTxFee, transferWithAllowedBlock, transfer, balanceChangeListener};
