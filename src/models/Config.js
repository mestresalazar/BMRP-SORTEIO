const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String },
    roleId: { type: String },
});

module.exports = mongoose.model('Config', configSchema);