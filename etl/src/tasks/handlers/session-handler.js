function sessionHandler(task, raw) {
    task.setSession(
        {
            blockNumber: task.block.number,
            sessionProgress: raw.sessionInfo.sessionProgress,
            sessionLength: raw.sessionInfo.sessionLength,
            eraProgress: raw.sessionInfo.eraProgress,
            eraLength: raw.sessionInfo.eraLength,
            validators: raw.validators.map(v => v.toString()),
        },
    );
}

module.exports = sessionHandler;
