let Model = require('../models/attempt_blocker');

let add = (data, next) => {
    Model.findOne({key: data.key}).then((result) => {
        if (!result || result.length === 0) {
            //Add New
            let model = new Model({
                key: data.key,
                firstAttempt: new Date(),
                attempts: 1
            });

            model.save((err, result) => {
                if(err) next(err);
                return sendResult(result, 0, next);
            });
        } else {
            //Check and Update Existing
            let id = result._id;
            let attempts = result.attempts;
            let firstAttempt = result.firstAttempt;
            let totalSecs = 15 * 60;
            let blockTime = result.blockTime != null ? new Date(result.blockTime) : null;
            let firstAttemptSecondsPassed = firstAttempt != null ? Math.abs((new Date().getTime() - firstAttempt.getTime()) / 1000) : 0;
            let secondsPassed = blockTime != null ? Math.abs((new Date().getTime() - blockTime.getTime()) / 1000) : 0;
            console.log("secondsPassed==>", secondsPassed);
            let secondsRemaining = secondsPassed > 0 ? (totalSecs - secondsPassed) : 0;
            if (secondsRemaining < 0 || (firstAttemptSecondsPassed > totalSecs && blockTime == null)) {
                //Reset
                remove(id, (err, result) => {
                    if(err) return next(err);
                    let model = new Model({
                        key: data.key,
                        firstAttempt: new Date(),
                        attempts: 1
                    });

                    model.save((err, result) => {
                        if(err) return next(err);
                        return sendResult(result, 0, next);
                    });
                });
            } else {
                //Update
                attempts++;
                if (attempts > 5) {
                    let blockTimeSecsPassed = 0;
                    if (blockTime != null)
                        blockTimeSecsPassed = Math.abs((new Date().getTime() - blockTime.getTime()) / 1000);
                    if (blockTime == null || blockTimeSecsPassed > (15 * 60))
                        blockTime = new Date();
                } else {
                    blockTime = null;
                }

                let model = {
                    attempts: attempts,
                    blockTime: blockTime
                }

                Model.findByIdAndUpdate(id, model).then((x) => {
                    loadById(id, (err, result) => {
                        if(err) return next(err);
                        if(blockTime != null) {
                            secondsPassed = Math.abs((new Date().getTime() - blockTime.getTime()) / 1000);
                            console.log("in secondsPassed==>", secondsPassed);
                            secondsRemaining = secondsPassed > 0 ? (totalSecs - secondsPassed) : 0;
                        }
                        return sendResult(result, secondsRemaining, next);
                    });
                }).catch((err) => {
                    next(err);
                });
            }
        }
    }).catch((err) => {
        next(err);
    });
}

function sendResult(data, secondsRemaining, next) {
    let result = {attempts: data.attempts};
    if(secondsRemaining > 0) {
        result.blockTime = data.blockTime;
        result.secondsRemaining = secondsRemaining;
        return next(result);
    }
    next(null, result);
}

let loadById = (id, next) => {
    Model.findById(id).then((result) => {
        next(null, result);
    }).catch(next);
}

let loadByKey = (key, next) => {
    Model.findOne({key: key}).then((result) => {
        if(!result) return next(null, {attempts: 0, secondsRemaining: 0});
        let totalSecs = 15 * 60;
        let blockTime = result.blockTime != null ? new Date(result.blockTime) : null;
        let secondsPassed = blockTime != null ? Math.abs((new Date().getTime() - blockTime.getTime()) / 1000) : 0;
        let secondsRemaining = secondsPassed > 0 ? (totalSecs - secondsPassed) : 0;
        sendResult(result, secondsRemaining, next);
    }).catch(next);
}

let remove = (id, next) => {
    Model.findByIdAndDelete(id).then((result) => {
        next(null, true);
    }).catch(next);
}

let removeByKey = (key, next) => {
    Model.findOneAndDelete({key: key}).then((result) => {
        next(null, true);
    }).catch(next);
}

module.exports = {
    add,
    remove,
    removeByKey,
    loadByKey
}