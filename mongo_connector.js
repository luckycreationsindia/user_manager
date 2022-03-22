const mongoose = require('mongoose');

async function getDatabase() {
    await mongoose.connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}

module.exports = async () => {
    global.db = await getDatabase();
};