const express = require('express');
const spotifyController = require('../Controllers/musicController');

const router = express.Router();

router.get('/recently-played/:access_token', spotifyController.getRecentlyPlayedTracks);
router.get('/current-played/:access_token', spotifyController.getCurrentlyPlayingTrack);
router.get('/user/:username/musicas/:date',  spotifyController.getNumberOfSongsListenedOnDate);

module.exports = router;
