const BlockTask = require('./block-task')

class BlockFactory {
    constructor(...handlers) {
        this.hanlers = [];
        this.handlers = [].concat(handlers);
    }

    async build(rawData) {
        const task = new BlockTask();
        task.stakingAssetId = rawData.stakingAssetId;
        task.spendingAssetId = rawData.spendingAssetId;

        for (const fn of this.handlers) {
            await fn(task, rawData);
        }
        await task.generateBalances();
        return task;
    }
}

module.exports = BlockFactory;
