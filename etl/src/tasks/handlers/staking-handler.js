const apiService = require('../../services/api');
const utils = require('../../utils');

async function stakingHandler(task, raw) {
    const { events, block } = raw;

    for (const e of events) {
        const evType = utils.getEventType(e);
        switch (evType) {
            case 'staking.Reward':
                const [lastValidators, lastSpendingAsset] = await Promise.all([
                    apiService.getValidators(block.header.parentHash),
                    apiService.getSpendingAssetId(block.header.parentHash),
                ]);
                lastValidators.forEach(lv => {
                    task.addStaking(
                        {
                            address: lv.toString(),
                            blockNumber: task.block.number,
                            event: 'Reward',
                            value: e.event.data[0].toString(),
                        },
                        lastSpendingAsset,
                    );
                });
                break;
            case 'staking.OfflineSlash':
                task.addStaking(
                    {
                        address: e.event.data[0].toString(),
                        blockNumber: task.block.number,
                        event: 'Slash',
                        value: e.event.data[1].toString(),
                    },
                );
                break;
            case 'staking.OfflineWarning':
                task.addStaking({
                        address: e.event.data[0].toString(),
                        blockNumber: task.block.number,
                        event: 'Warning',
                        value: e.event.data[1].toString(),
                    },
                );
                break;
            default:
                break;
        }
    }
    if (raw.sessionInfo.eraProgress === 0) {
        raw.validators.forEach(v => {
            task.addStaking(
                {
                    address: v.toString(),
                    blockNumber: task.block.number,
                    event: 'Start',
                    value: null,
                },
            );
        });
    }
}

module.exports = stakingHandler();
