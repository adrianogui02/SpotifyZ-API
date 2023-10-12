const axios = require('axios');
const Music = require('../Models/music');
const UserData = require('../Models/music');

const getRecentlyPlayedTracks = async (req, res) => {
  const { access_token } = req.params;
  try {
    // Obter dados do usuário
    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    // Obter dados das músicas recentemente tocadas
    const musicResponse = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const currentDate = new Date(); // Data e hora atuais

    // Filtra apenas as músicas tocadas nas últimas 24 horas
    const recentlyPlayedTracks = musicResponse.data.items.filter(item => {
      const playedAt = new Date(item.played_at);
      const timeDifference = currentDate - playedAt;
      const hoursDifference = timeDifference / (1000 * 60 * 60); // Diferença em horas

      return hoursDifference <= 24; // Retorna true se a música foi tocada nas últimas 24 horas
    });

    // Mapeie as músicas para o formato esperado pelo esquema Music
    const musicData = recentlyPlayedTracks.map(item => {
      return {
        name: item.track.name,
        artists: item.track.artists.map(artist => artist.name).join(', '),
        album: item.track.album.name,
        imageUrl: item.track.album.images.length > 0 ? item.track.album.images[0].url : null,
        playedAt: item.played_at,
      };
    });

    // Salva as músicas e os dados do usuário no banco de dados
    const user = new UserData({
      spotifyId: userResponse.data.id,
      displayName: userResponse.data.display_name,
      email: userResponse.data.email,
      musicData: musicData,
    });

    await user.save();

    res.json(recentlyPlayedTracks);
  } catch (error) {
    console.error('Erro ao obter músicas escutadas recentemente:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const getCurrentlyPlayingTrack = async (req, res) => {

  const { access_token } = req.params;
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (response.data && response.data.item) {
      const currentlyPlayingTrack = {
        name: response.data.item.name,
        artists: response.data.item.artists.map(artist => artist.name).join(', '),
        album: response.data.item.album.name,
        imageUrl: response.data.item.album.images.length > 0 ? response.data.item.album.images[0].url : null,
      };
      res.json(currentlyPlayingTrack);
    } else {
      return null; // Retorna null se não estiver escutando nada no momento
    }
  } catch (error) {
    console.error('Erro ao obter música atualmente em reprodução:', error.response ? error.response.data : error);
    throw error; // Propaga o erro para que seja tratado onde a função foi chamada
  }
};

module.exports = {
  getRecentlyPlayedTracks,
  getCurrentlyPlayingTrack,
};


