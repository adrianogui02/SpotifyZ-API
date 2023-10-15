const axios = require("axios");
const UserData = require("../Models/music");
const User = require('../../DB/Models/tokens');

const getRecentlyPlayedTracks = async () => {
  
  try {
    const users = await User.find(); // Obtenha todos os usuários cadastrados

    // Para cada usuário, atualize o token de acesso usando o refresh token
    users.forEach(async (user) => {
      console.log(user.displayName)
      // Obter dados do usuário
      const userResponse = await axios.get("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });
      let newUserCreated = false;
      // Verificar se o usuário existe no banco de dados
      let userdb = await UserData.findOne({ spotifyId: userResponse.data.id });

      // Se o usuário não existe, crie um novo documento UserData para ele
      if (!userdb) {
        userdb = new UserData({
          spotifyId: userResponse.data.id,
          displayName: userResponse.data.display_name,
          email: userResponse.data.email,
          musicData: [],
        });
        newUserCreated = true;
        await userdb.save(); // Salva o novo usuário no banco de dados
      }

      // Obter dados da última música tocada
      const musicResponse = await axios.get(
        "https://api.spotify.com/v1/me/player/recently-played",
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      // Obter a última música tocada
      const lastPlayedTrack = musicResponse.data.items[0];
      const album = lastPlayedTrack.track.album;

      const musicData = {
        name: lastPlayedTrack.track.name,
        artists: lastPlayedTrack.track.artists
          .map((artist) => artist.name)
          .join(", "),
        album: {
          name: album.name,
          album_type: album.album_type,
          total_tracks: album.total_tracks,
          release_date: album.release_date,
          release_date_precision: album.release_date_precision,
          images: album.images,
        },
        imageUrl:
          album.images.length > 0 ? album.images[0].url : null,
        playedAt: lastPlayedTrack.played_at,
        duration_ms: lastPlayedTrack.track.duration_ms,
        popularity: lastPlayedTrack.track.popularity,
      };

      // Verificar se a música já está no banco de dados pelo played_at
      const existingMusic = await UserData.findOne({
        spotifyId: userResponse.data.id,
        "musicData.playedAt": lastPlayedTrack.played_at,
      });

      // Se a música já existe no banco de dados, não faça nada
      if (existingMusic) {
        console.log("Última música já salva no banco de dados.");
        return;
      }

      // Adicionar a última música ao histórico de músicas do usuário
      const updateResult = await UserData.updateOne(
        { spotifyId: userResponse.data.id },
        {
          $push: {
            musicData: musicData,
          },
        },
        { upsert: true } // Esta opção cria o documento se ele não existir
      );

      if (newUserCreated === true && updateResult.modifiedCount > 0){
        console.log('Usuário criado e última música adicionada ao histórico.');
        newUserCreated == false;
      }
  
      if (updateResult.modifiedCount > 0){
        console.log('Última música adicionada ao histórico.');
      } else{
        console.error('Erro ao adicionar música ao histórico.');
      }

    });

  } catch (error) {
    console.error(
      "Erro ao obter música escutada recentemente:",
      error.response ? error.response.data : error
    );
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

const getNumberOfSongsListenedOnDate = async (req, res) => {
  const { username, date } = req.params;

  // Verifique se a data é válida
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!isValidDate) {
    return res.status(400).json({ message: 'Formato de data inválido. Use YYYY-MM-DD.' });
  }

  try {
    const user = await UserData.findOne({ displayName: username });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Converta a data fornecida para o formato ISO 8601 (sem a hora)
    const isoDate = new Date(date);
    
    // Consulte no banco de dados com a data formatada
    const songsListenedOnDate = user.musicData.filter(
      (music) => {
        const musicDate = new Date(music.playedAt); // Converte a string de playedAt para um objeto Date
        return musicDate.toISOString().split('T')[0] === isoDate.toISOString().split('T')[0];
      }
    );

    if (songsListenedOnDate.length === 0) {
      return res.status(404).json({ message: 'Nenhuma música encontrada para esta data.' });
    }

    // Agrupar músicas por nome e contar quantas vezes cada uma foi ouvida
    const musicCounts = {};
    songsListenedOnDate.forEach((music) => {
      const musicName = music.name;
      if (musicCounts[musicName]) {
        musicCounts[musicName].count++;
      } else {
        musicCounts[musicName] = {
          count: 1,
          // ... outras propriedades da música ...
        };
      }
    });

    // Converter o objeto em uma lista de músicas com contagem e posição
    const musicList = Object.keys(musicCounts).map((musicName) => ({
      name: musicName,
      count: musicCounts[musicName].count,
      // ... outras propriedades da música ...
    }));

    // Ordenar a lista por contagem (da mais ouvida para a menos ouvida)
    musicList.sort((a, b) => b.count - a.count);

    // Adicionar a propriedade 'position' com base na ordem da lista
    musicList.forEach((music, index) => {
      music.position = index + 1; // A posição começa de 1 (a música mais ouvida)
    });

    // Calcular o tempo total das músicas em segundos e em horas
    const totalDurationSeconds = songsListenedOnDate.reduce((total, music) => {
      return total + (music.duration_ms / 1000); // duration_ms está em milissegundos, então dividimos por 1000 para obter segundos
    }, 0);
    const totalDurationHours = totalDurationSeconds / 3600; // 3600 segundos em uma hora

    return res.json({
      message: `${username} ouviu ${songsListenedOnDate.length} músicas em ${isoDate.toISOString().split('T')[0]}.`,
      musicList: musicList,
      totalDurationSeconds: totalDurationSeconds,
      totalDurationHours: totalDurationHours,
    });
  } catch (error) {
    console.error('Erro ao obter músicas ouvidas na data:', error);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};




module.exports = {
  getRecentlyPlayedTracks,
  getCurrentlyPlayingTrack,
  getNumberOfSongsListenedOnDate,
};
