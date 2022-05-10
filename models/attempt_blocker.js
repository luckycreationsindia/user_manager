const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttemptBlocker = new Schema({
    key: {type: String, required: true, unique: true},
    attempts: {type: Number, required: true, default: 0},
    firstAttempt: {type: Date},
    blockTime: {type: Date},
}, {timestamps: true, collection: 'attempt_blocker'});

module.exports = mongoose.model('AttemptBlocker', AttemptBlocker, "attempt_blocker");