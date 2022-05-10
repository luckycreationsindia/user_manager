const dotenv = require('dotenv');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require("cors");
const passport = require('passport');
const passportConfig = require('./passport_config');
const MongoDBStore = require('connect-mongodb-session')(session);

dotenv.config({path: './config/config.env'});

global.dbConfig = require("./config/db.config");
const authConfig = require("./config/auth.config");

require('./mongo_connector')();
const sessionStore = new MongoDBStore({
    uri: `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`,
    databaseName: dbConfig.DB,
    collection: 'sessions',
    connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
    }
});

const app = express();

const whitelist = ['http://developer1.com', 'http://developer2.com']
const corsOptions = {
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(null, true);
            //callback(new Error())
        }
    },
    credentials: true
}

app.use(cors(corsOptions));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
passportConfig(passport);
let sess = session({
    key: 'token',
    secret: authConfig.secret,
    store: sessionStore,
    name: 'token',
    touchAfter: 24 * 3600, resave: true, saveUninitialized: true, autoRemove: 'native',
    cookie: {secure: false, maxAge: new Date().getTime() + (60 * 60 * 24 * 1000 * 7)},
});
app.use(sess);
app.use(passport.initialize());
app.use(passport.session());

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const attemptBlockerService = require('./services/attempt_blocker');

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.get('/testFailure', (req, res) => {
    let key = Buffer.from(req.socket.remoteAddress + ":luckycreationsindia@gmail.com").toString('base64');
    attemptBlockerService.loadByKey(key, (err, result) => {
        if (err) {
            console.error(err);
            return res.json({status: "Error", message: !(err instanceof Error) ? err : err.message});
        } else {
            if (result.secondsRemaining > 0) {
                return res.json({status: "Error", message: result});
            }
            attemptBlockerService.add({key: key}, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.json({status: "Error", message: !(err instanceof Error) ? err : err.message});
                } else {
                    return res.json({status: "Success", message: result});
                }
            });
        }
    });

});

module.exports = app;
