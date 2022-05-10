const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: {type: String, required: true, unique: true},
    password: {
        type: String,
        required: true,
    },
    first_name: {type: String, required: true},
    last_name: {type: String},
    mobile: {
        type: Number
    },
    status: {
        type: Boolean,
        default: false
    },
    address: String,
    city: {
        type: String,
        default: "Bangalore",
    },
    state: {
        type: String,
        default: "Karnataka",
    },
    country: {
        type: String,
        default: "India",
    },
    pincode: Number,
    role: {
        type: Number,
        default: 0
    },
    totp_secret: String,
}, {timestamps: true, collection: 'users'});

UserSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

UserSchema.virtual('display_name').get(function () {
    return getDisplayName(this);
});

function getDisplayName(x) {
    let name = x.first_name;
    if (name) {
        if (x.last_name) {
            name += " " + x.last_name;
        }
    } else {
        name = x.email;
    }
    return name;
}

module.exports = mongoose.model('User', UserSchema, "users");