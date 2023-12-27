// models/team.js

const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    image: {
        type: Buffer, // Store binary image data
        required: true,
    },
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
