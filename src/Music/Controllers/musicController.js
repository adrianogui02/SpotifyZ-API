const axios = require("axios");
const Music = require("../Models/music");
const UserData = require("../Models/music");

const getRecentlyPlayedTracks = async (req, res) => {
  const { access_token } = req.params;
  try {
    // Obter dados do usuário
    const userResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let newUserCreated = false;
    // Verificar se o usuário existe no banco de dados
    let user = await UserData.findOne({ spotifyId: userResponse.data.id });

    // Se o usuário não existe, crie um novo documento UserData para ele
    if (!user) {
      user = new UserData({
        spotifyId: userResponse.data.id,
        displayName: userResponse.data.display_name,
        email: userResponse.data.email,
        musicData: [],
      });
      newUserCreated = true;
      await user.save(); // Salva o novo usuário no banco de dados
    }

    // Obter dados da última música tocada
    const musicResponse = await axios.get(
      "https://api.spotify.com/v1/me/player/recently-played",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    // Obter a última música tocada
    const lastPlayedTrack = musicResponse.data.items[0];

    // Verificar se a música já está no banco de dados pelo played_at
    const existingMusic = await UserData.findOne({
      spotifyId: userResponse.data.id,
      "musicData.playedAt": lastPlayedTrack.played_at,
    });

    // Se a música já existe no banco de dados, não faça nada
    if (existingMusic) {
      res.json({ message: "Última música já salva no banco de dados." });
      return;
    }

    // Adicionar a última música ao histórico de músicas do usuário
    const updateResult = await UserData.updateOne(
      { spotifyId: userResponse.data.id },
      {
        $push: {
          musicData: {
            name: lastPlayedTrack.track.name,
            artists: lastPlayedTrack.track.artists
              .map((artist) => artist.name)
              .join(", "),
            album: lastPlayedTrack.track.album.name,
            imageUrl:
              lastPlayedTrack.track.album.images.length > 0
                ? lastPlayedTrack.track.album.images[0].url
                : null,
            playedAt: lastPlayedTrack.played_at,
          },
        },
      },
      { upsert: true } // Esta opção cria o documento se ele não existir
    );


    if (newUserCreated === true && updateResult.modifiedCount > 0){
      res.json({ message: 'Usuário criado e última música adicionada ao histórico.'});
      newUserCreated == false;
    }

    if (updateResult.modifiedCount > 0){
      res.json({ message: 'Última música adicionada ao histórico.'});
    } else{
      res.status(500).json({ message: 'Erro ao adicionar música ao histórico.'});
    }

  } catch (error) {
    console.error(
      "Erro ao obter música escutada recentemente:",
      error.response ? error.response.data : error
    );
    res
      .status(500)
      .json({ error: "Internal Server Error", newUserCreated: false });
  }
};

const getCurrentlyPlayingTrack = async (req, res) => {
  const { access_token } = req.params;
  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (response.data && response.data.item) {
      const currentlyPlayingTrack = {
        name: response.data.item.name,
        artists: response.data.item.artists
          .map((artist) => artist.name)
          .join(", "),
        album: response.data.item.album.name,
        imageUrl:
          response.data.item.album.images.length > 0
            ? response.data.item.album.images[0].url
            : null,
      };
      res.json(currentlyPlayingTrack);
    } else {
      return null; // Retorna null se não estiver escutando nada no momento
    }
  } catch (error) {
    console.error(
      "Erro ao obter música atualmente em reprodução:",
      error.response ? error.response.data : error
    );
    throw error; // Propaga o erro para que seja tratado onde a função foi chamada
  }
};

module.exports = {
  getRecentlyPlayedTracks,
  getCurrentlyPlayingTrack,
};
