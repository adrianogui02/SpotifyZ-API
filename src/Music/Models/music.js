const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const musicSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  artists: {
    type: String,
    required: true,
  },
  album: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  playedAt: {
    type: Date,
    required: true,
  },
});

const userSchema = new Schema({
  spotifyId: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  musicData: [musicSchema],
});

const UserData = mongoose.model('UserData', userSchema);

module.exports = UserData;
