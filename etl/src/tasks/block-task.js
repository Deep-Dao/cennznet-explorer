const apiService = require('../services/api');
// const classTransformer = require('class-transformer');


class BlockTask {
    addTransaction(tx) {
        this.block.transactionCount++;
        this.transactions.push(tx);

        for (const acc of [tx.fromAddress, tx.toAddress]) {
            this.addChange(acc, tx.assetId);
            if (acc === tx.fromAddress && tx.assetId !== this.spendingAssetId) {
                this.addChange(acc, this.spendingAssetId);
            }
        }
    }

    addTrace(trace) {
        this.traces.push(trace);
        for (const acc of [trace.fromAddress, trace.toAddress]) {
            this.addChange(acc, trace.assetId);
            // always check spend token for sender
            if (acc === trace.fromAddress && trace.assetId !== this.spendingAssetId) {
                this.addChange(acc, this.spendingAssetId);
            }
        }
    }

    addContract(contract) {
        this.contracts.push(contract);
        this.addChange(contract.creator, this.spendingAssetId);
        this.addChange(contract.address, this.spendingAssetId);
    }

    addAttestation(attestation) {
        this.attestations.push(attestation);
        this.addChange(attestation.issuer, this.spendingAssetId);
    }

    addNewAsset(asset) {
        this.newAssets.push(asset);
        if (asset.creator) {
            this.addChange(asset.creator, this.spendingAssetId);
        }
    }

    setSession(session) {
        this.session.push(session);
    }

    addStaking(staking, assetId) {
        this.stakings.push(staking);
        if (staking.event === StakingType.Reward) {
            assetId !== undefined
                ? this.addChange(staking.address, assetId)
                : this.addChange(staking.address, this.spendingAssetId);
        } else if (staking.event === StakingType.Slash) {
            assetId !== undefined
                ? this.addChange(staking.address, assetId)
                : this.addChange(staking.address, this.stakingAssetId);
        }
    }

    get(key) {
        return this[key];
    }

    async generateBalances() {
        const blockHash = 1; //new Hash(this.block.hash)
        const balanceSearch = [];
        if (this.changes) {
            for (const acc of Object.keys(this.changes)) {
                for (const assetId of this.changes[acc]) {
                    balanceSearch.push({ address: acc, assetId });
                }
            }
        }

        const data = await Promise.all(
            balanceSearch.map(bal => apiService.getBalance(bal.assetId, bal.address, blockHash)),
        );

        for (const [idx, value] of data.entries()) {
            const { address, assetId } = balanceSearch[idx];
            const b = {
                address,
                balance: value.free,
                blockNumber: this.block.number,
                assetId,
                reservedBalance: value.reserved,
            };
            this.balances.push(b);
        }
    }

    addChange(addr, assetId) {
        if (this.changes[addr]) {
            if (!this.changes[addr].includes(assetId)) {
                this.changes[addr].push(assetId);
            }
        } else {
            this.changes[addr] = [assetId];
        }
    }
}


module.exports = BlockTask;
