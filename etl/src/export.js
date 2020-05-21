const TaskCollection = require('./tasks/task-collection');
const BlockFactory = require('./tasks/block-factory');
const apiService = require('./services/api');
const dbService = require('./services/db.service');
const blockHandler = require('./tasks/handlers/block-handler');
const txHandler = require('./tasks/handlers/block-handler');
const sessionHandler = require('./tasks/handlers/block-handler');
const stakingHandler = require('./tasks/handlers/block-handler');
const contractHandler = require('./tasks/handlers/block-handler');
const assetHandler = require('./tasks/handlers/block-handler');
const attestationHandler = require('./tasks/handlers/block-handler');
const _ = require('lodash');


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

let targetBlockNumber, currentBlockNumber, maxConcurrency;
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
        console.error(e.stack);
        console.error(args.block_number);
        throw new Error('Something wrong');
    })
    .finally(() => {
        console.info(`${process.exitCode}`);
        process.exit();
    });

async function main(bn, connectionString, uri, schema, workers, tn, latest,) {
    console.debug('Connecting to the node...');
    await apiService.connect({ provider: uri });
    await dbService.init({ connectionString, schema });
    targetBlockNumber = await apiService.getBlock().then(b => b.header.number.toNumber());
    currentBlockNumber = 2;
    maxConcurrency = workers;
    console.info(`start: ${currentBlockNumber}, tartget: ${targetBlockNumber}`);

    await sync(targetBlockNumber);
}

async function sync(targetNumber) {
    if (currentBlockNumber >= targetNumber) {
        return;
    }
    if (targetNumber > currentBlockNumber) {
        if (targetNumber - currentBlockNumber > maxConcurrency) {
            targetNumber = currentBlockNumber + maxConcurrency;
        }
        console.info(`Start to process blocks: ${currentBlockNumber} - ${targetNumber}`);

        try {
            const collection = await Promise.all(
                _.range(currentBlockNumber, targetNumber).map(n => buildTask(n)),
            ).then(tasks => new TaskCollection(tasks));
            console.debug(`blocks extracted.`);
            console.debug('Saving to db...');
            await dbService.saveBlockTasks(collection);
            console.debug('Saved to db');
            console.info(
                `${collection.length} blocks saved. range: ${collection.first.block.number} - ${
                    collection.last.block.number
                }. `,
            );
            currentBlockNumber = targetNumber;
        } catch (err) {
            process.exitCode = 1;
            console.error('sync error', { err });
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
