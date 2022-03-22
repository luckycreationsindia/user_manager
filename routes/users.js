const express = require('express');
const router = express.Router();
const UserAuth = require('../controllers/auth');
const User = require('../controllers/user');

/* GET Current User. */
router.get('/', User.profile);

/* Register New User */
router.post('/register', UserAuth.signup);

/* User Login */
router.post('/login', UserAuth.signin);

/* User Logout */
router.get('/logout', UserAuth.logout);

module.exports = router;
