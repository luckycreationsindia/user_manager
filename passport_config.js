const LocalStrategy = require('passport-local').Strategy;
const User = require("./models/user");
const bcrypt = require('bcryptjs');
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
        (req, email, password, done) => {
            User.find({email: email}, (err, rows) => {
                if (err) return done(null, false, {
                    status: 'Error',
                    message: 'Error connecting to database',
                    error: err.message
                });
                try {
                    if (!rows.length)
                        return done(null, false, {status: 'Error', message: 'Invalid username/password'});

                    let user = rows[0];
                    if (!user.status)
                        return done(null, false, {
                            status: 'Error',
                            message: 'Please wait until Admin/Manager Verify your Account'
                        });

                    if (!bcrypt.compareSync(password, user.password)) {
                        return done(null, false, {status: 'Error', message: 'Invalid username/password'});
                    }

                    req.session.username = user.email;
                    return done(null, user);
                } catch (err) {
                    done(null, false, {status: 'Error', message: 'Error connecting to database'});
                }
            });
        }));

};