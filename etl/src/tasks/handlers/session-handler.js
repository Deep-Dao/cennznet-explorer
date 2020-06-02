function sessionHandler(task, raw) {
    task.setSession(
        {
            block_number: task.block.number,
            session_progress: isNaN(raw.sessionInfo.sessionProgress) ? 0 : raw.sessionInfo.sessionProgress,
            session_length: raw.sessionInfo.sessionLength,
            era_progress: raw.sessionInfo.eraProgress,
            era_length: raw.sessionInfo.eraLength,
            validators: raw.validators.map(v => v.toString()),
        },
    );
}

module.exports = sessionHandler;
