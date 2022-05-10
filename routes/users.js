const express = require('express');
const router = express.Router();
const UserAuth = require('../controllers/auth');
const User = require('../controllers/user');
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;

/* GET Current User. */
router.get('/', User.profile);

/* Register New User */
router.post('/register', UserAuth.signup);

/* User Login */
router.post('/login', UserAuth.signin);

/* User TOTP Login */
router.post('/totp-login', UserAuth.totpSignin);

/* User Logout */
router.get('/logout', UserAuth.logout);

/* Generate 2FA for Authenticator App */
router.get('/generate2fa', (req, res) => {
    let data = GoogleAuthenticator.register(req.user.email);
    req.session.temp_totp_secret = data.secret;
    res.send(data.qr);
});

/* Add TOTP Secret */
router.post('/addTOTPSecret', User.addTOTPSecret);

module.exports = router;
