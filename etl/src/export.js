const TaskCollection = require('./tasks/task-collection');
const BlockFactory = require('./tasks/block-factory');
const apiService = require('./services/api');
const dbService = require('./services/db.service');
const blockHandler = require('./tasks/handlers/block-handler');
const txHandler = require('./tasks/handlers/tx-handler');
const sessionHandler = require('./tasks/handlers/session-handler');
const stakingHandler = require('./tasks/handlers/staking-handler');
const contractHandler = require('./tasks/handlers/contract-handler');
const assetHandler = require('./tasks/handlers/asset-handler');
const attestationHandler = require('./tasks/handlers/attestation-handler');
const _ = require('lodash');
const logger = require('./logger');

const args = require('yargs')
    .option('block_number', {
        alias: 'b',
        demand: true,
    })
    .option('output', {
        alias: 'o',
        demand: true,
    })
    .option('provider_uri', {
        alias: 'p',
        demand: true,
    })
    .option('schema', {
        alias: 's',
        demand: false,
        default: 'dev',
    })
    .option('target_number', {
        alias: 't',
        demand: false,
    })
    .option('workers', {
        alias: 'w',
        demand: false,
        default: 50,
    })
    .boolean('latest')
    .alias('latest', ['l']).argv;

let targetBlockNumber, currentBlockNumber, maxConcurrency, targetBlockNumberNew;
const factory = new BlockFactory(
    blockHandler,
    txHandler,
    sessionHandler,
    stakingHandler,
    contractHandler,
    assetHandler,
    attestationHandler,
);

main(
    args.block_number,
    args.output,
    args.provider_uri,
    args.schema,
    args.workers,
    args.target_number,
    args.latest,
)
    .catch(e => {
        process.exitCode = 1;
        logger.error('main', e.stack);
        logger.error('main', args.block_number);
        throw new Error('Something wrong');
    })
    .finally(() => {
        logger.info(`${process.exitCode}`);
        process.exit();
    });

async function main(bn, connectionString, uri, schema, workers, tn, latest,) {
    logger.debug('Connecting to the node...');
    await apiService.connect({ provider: uri });
    await dbService.init({ connectionString, schema });
    targetBlockNumber = bn + 1;
    currentBlockNumber = bn;
    maxConcurrency = workers;
    logger.info(`start: ${currentBlockNumber}, tartget: ${targetBlockNumber}`);

    await sync(targetBlockNumber);
}

async function sync(targetNumber) {
    if (currentBlockNumber >= targetNumber) {
        logger.info(`sync targetNumber: ${targetNumber}; currentBlockNumber: ${currentBlockNumber} - ${targetNumber}`);
        return;
    }

    if (targetNumber > currentBlockNumber) {
        if (targetNumber - currentBlockNumber > maxConcurrency) {
            targetNumber = currentBlockNumber + maxConcurrency;
        }
        logger.info(`Start to process blocks: ${currentBlockNumber} - ${targetNumber}`);

        try {
            const collection = await Promise.all(
                _.range(currentBlockNumber, targetNumber).map(n => buildTask(n)),
            ).then(tasks => new TaskCollection(tasks));
            logger.debug(`blocks extracted.`);
            logger.debug('Saving to db...');
            await dbService.saveBlockTasks(collection);
            currentBlockNumber = targetNumber;
        } catch (err) {
            logger.error('sync error ' + JSON.stringify(err) + 'targetNumber: ' + targetNumber);
            process.exitCode = 1;
            return;
        }
    }
    await sync(targetBlockNumber);
}


async function buildTask(bn) {
    const rawBlock = await apiService.getBlock(bn);
    const [
        blockFee,
        events,
        validators,
        sessionInfo,
        spendingAssetId,
        stakingAssetId,
    ] = await Promise.all([
        apiService.getBlockFee(rawBlock.header.hash),
        apiService.getEvents(rawBlock.header.hash),
        apiService.getValidators(rawBlock.header.hash),
        apiService.getSessionInfo(rawBlock.header.hash, bn),
        apiService.getSpendingAssetId(rawBlock.header.hash),
        apiService.getStakingAssetId(rawBlock.header.hash),
    ]);

    return factory.build({
        blockFee,
        events,
        validators,
        block: rawBlock,
        sessionInfo,
        spendingAssetId,
        stakingAssetId,
    });
}

//node src/export.js -b 197 -p ws://192.168.0.106:9944 -o postgresql://username:password@db:5432/cennznetdata -s public
