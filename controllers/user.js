const passport = require("passport");
const Model = require('../models/user');
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
const totp = require('notp').totp;

exports.profile = async (req, res, next) => {
    if(req.user) {
        return res.json({status: "Success", data: req.user, message: "Success"});
    } else {
        return res.json({status: "Error", message: "Please Login First"});
    }
};

exports.addTOTPSecret = async (req, res) => {
    if(req.user) {
        if(!req.session.temp_totp_secret) {
            return res.json({status: "Error", message: "Generate TOTP First"});
        }
        if(!req.body.code) {
            return res.json({status: "Error", message: "Code is missing"});
        }
        let decodedSecret = GoogleAuthenticator.decodeSecret(req.session.temp_totp_secret);
        let isValid = totp.verify(req.body.code, decodedSecret, {
            window: 6,
            time: 30
        });
        if(!isValid) {
            return res.json({status: "Error", message: "Invalid Code. Try Again."});
        }
        let secret = req.session.temp_totp_secret;
        let user = {
            totp_secret: secret,
        };

        Model.findByIdAndUpdate(req.user._id, user, {}, function (err, result) {
            if (err) {
                return res.json({status: "Error", message: err.message});
            } else {
                return res.json({status: "Success", message: "Success"});
            }
        });
    } else {
        return res.json({status: "Error", message: "Please Login First"});
    }
};