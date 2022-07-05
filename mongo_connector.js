const mongoose = require('mongoose');

async function getDatabase() {
    return mongoose.connect(`mongodb://${process.env['DB_HOST']}:${process.env['DB_PORT']}/${process.env['DB_NAME']}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}

module.exports = async () => {
    global.db = await getDatabase();
};