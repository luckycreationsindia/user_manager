const LocalStrategy = require('passport-local').Strategy;
const User = require("./models/user");
const bcrypt = require('bcryptjs');
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
const TwoFAStartegy = require('passport-2fa-totp').Strategy;
const RateLimiterMongo = require('rate-limiter-flexible').RateLimiterMongo;
const saltRounds = 10;

// expose this function to our app using module.exports
module.exports = function (passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.find({_id: id}, {password: 0}, (err, rows) => {
            if (err) return done(null, false, {
                status: 'Error',
                message: 'Error connecting to database',
                error: err.message
            });
            try {
                let user = rows[0];
                done(err, user);
            } catch (err) {
                done(null, false, {status: 'Error', message: 'Error connecting to database'});
            }
        });
    });


    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        (req, email, password, done) => {
            if (!req.body.first_name || !req.body.email) {
                return done(null, false, {status: 'Error', message: 'All Fields are Required.'});
            }

            passwordValidationCheck(password).then(() => {
                let hash = bcrypt.hashSync(password, saltRounds);

                const user = new User({
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    email: req.body.email,
                    password: hash,
                    mobile: req.body.mobile,
                    address: req.body.address,
                    city: req.body.city,
                    state: req.body.state,
                    country: req.body.country,
                    pincode: req.body.pincode,
                    role: 0,
                    status: false
                });

                user.save(function (err, user) {
                    if (err) {
                        return done(err);
                    } else {
                        return done(null, false, {status: 'Success', message: 'Registration Successful'});
                    }
                });
            }).catch((error) => {
                return done(null, false, {status: 'Error', message: error.message});
            });
        }));

    // =========================================================================
    // TOTP LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for tfa and one for signup
    // by default, if there was no name, it would just be called '2fa-totp'

    passport.use('local-totp', new TwoFAStartegy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    }, verifyUser, (req, user, done) => {
        // 2nd step verification: TOTP code from Google Authenticator

        if (!user.totp_secret) {
            done(new Error("Google Authenticator is not setup yet."));
        } else {
            // Google Authenticator uses 30 seconds key period
            // https://github.com/google/google-authenticator/wiki/Key-Uri-Format

            let secret = GoogleAuthenticator.decodeSecret(user.totp_secret);
            req.session.username = user.email;
            done(null, secret, 30);
        }
    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true
        },
        verifyUser));

    function verifyUser(req, email, password, done) {
        const rateLimiter = new RateLimiterMongo({storeClient: db.connection, duration: 10, points: 5, blockDuration: 900});
        User.find({email: email}, (err, rows) => {
            if (err) {
                return done(null, false, {
                    status: 'Error',
                    message: 'Error connecting to database',
                    error: err.message
                });
            }
            try {
                if (!rows.length) {
                    console.log("RATE LIMITER CONSUME==> UserName");
                    rateLimiter.consume(req.socket.remoteAddress).then((result) => {
                        console.log(result);
                        return done(null, false, {status: 'Error', message: 'Invalid username/password'});
                    }).catch((err) => {
                        console.error(err);
                        return done(null, false, {
                            status: 'Error',
                            message: 'Max Failed Attempt Reached. Please wait for 15mins and try again.',
                            error: err.message
                        });
                    });
                } else {
                    let user = rows[0];
                    if (!user.status)
                        return done(null, false, {
                            status: 'Error',
                            message: 'Please wait until Admin/Manager Verify your Account'
                        });

                    if (!bcrypt.compareSync(password, user.password)) {
                        console.log("RATE LIMITER CONSUME==> Password");
                        rateLimiter.consume(req.socket.remoteAddress).then((result) => {
                            console.log(result);
                            return done(null, false, {status: 'Error', message: 'Invalid username/password'});
                        }).catch((err) => {
                            console.error(err);
                            return done(null, false, {
                                status: 'Error',
                                message: 'Max Failed Attempt Reached. Please wait for 15mins and try again.',
                                error: err.message
                            });
                        });
                    } else {
                        req.session.username = user.email;
                        return done(null, user);
                    }
                }
            } catch (err) {
                done(null, false, {status: 'Error', message: 'Error connecting to database'});
            }
        });
    }

    function passwordValidationCheck(password) {
        return new Promise((resolve, reject) => {
            let checkData = {passwordRegEx: "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$",
                passwordRegExErrorMessage: "Password should be at least 8 character long and should contain digit, uppercase and lowercase",
                passwordMaxLength: 25,
                passwordMaxLengthErrorMessage: "Password length should be maximum of 25 characters long"};
            Promise.resolve().then(() => {
                // Password - Minimum eight characters, at least one uppercase letter, one lowercase letter and one number:
                // RegEx Example - "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$"
                // At least one upper case English letter, (?=.*?[A-Z])
                // At least one lower case English letter, (?=.*?[a-z])
                // At least one digit, (?=.*?[0-9])
                // Minimum eight in length .{8,} (with the anchors)
                let passwordRegEx = checkData.passwordRegEx;

                //Error Message to send to Frontend if regex doesn't match
                let passwordErrorMessage = checkData.passwordRegExErrorMessage;

                let result = new RegExp(passwordRegEx).exec(password);
                if(!result) {
                    return Promise.reject(new Error(passwordErrorMessage));
                }
            }).then(() => {
                if(password.length > checkData.passwordMaxLength) {
                    return Promise.reject(new Error(checkData.passwordMaxLengthErrorMessage))
                }
                resolve();
            }).catch(reject);
        });
    }
};