const mongoose = require('mongoose');
const Schema = mongoose.Schema;


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
  musicData:[],
});

const UserData = mongoose.model('UserData', userSchema);

module.exports = UserData;
