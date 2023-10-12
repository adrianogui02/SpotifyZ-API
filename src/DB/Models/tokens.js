const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  spotifyId: String, // O ID do usuário no Spotify, se necessário
  displayName: String,
  email: String, 
  accessToken: String,
  refreshToken: String,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
