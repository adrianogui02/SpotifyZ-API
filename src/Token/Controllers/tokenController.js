const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const User = require('../../DB/Models/tokens');
require('dotenv').config();

const client_id = 'f046925462574370acd7a0a74f54a10e'
const client_secret = '32b1d4ee74184aa191db0d4e459e44d7'
const redirect_uri = 'http://localhost:8888/auth/callback'
const stateKey = 'spotify_auth_state'

const generateRandomString = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


const login = (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);
  
    const scope = 'user-read-private user-read-email user-read-playback-state user-library-read user-top-read user-read-recently-played user-read-playback-position user-read-playback-state user-read-currently-playing user-follow-read playlist-read-collaborative playlist-read-private ugc-image-upload user-read-playback-position user-read-private user-read-email'; 
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      }));
};

const callback = (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;
  
    if (state === null || state !== storedState) {
      res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
    } else {
      res.clearCookie(stateKey);
  
      const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          code: code,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code',
        },
        headers: {
          'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        },
        json: true,
      };
  
      request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const access_token = body.access_token;
          const refresh_token = body.refresh_token;
  
          // Recuperar dados do usuário do Spotify
          const userInfoOptions = {
            url: 'https://api.spotify.com/v1/me',
            headers: {
              'Authorization': 'Bearer ' + access_token,
            },
            json: true,
          };
  
          request.get(userInfoOptions, (userError, userResponse, userBody) => {
            if (!userError && userResponse.statusCode === 200) {
              // Salve os tokens e os dados do usuário no MongoDB
              const user = new User({
                spotifyId: userBody.id,
                displayName: userBody.display_name,
                email: userBody.email,
                accessToken: access_token,
                refreshToken: refresh_token,
              });
  
              user.save()
                .then(() => {
                  // Redirecione para a página de sucesso após salvar os dados no MongoDB
                  res.redirect('/sucesso');
                })
                .catch((err) => {
                  console.error('Erro ao salvar os dados no MongoDB:', err);
                  res.redirect('/#' + querystring.stringify({ error: 'server_error' }));
                });
            } else {
              res.redirect('/#' + querystring.stringify({ error: 'failed_to_get_user_info' }));
            }
          });
        } else {
          res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
        }
      });
    }
};

const refreshTokens = async () => {
  try {
    const users = await User.find(); // Obtenha todos os usuários cadastrados

    // Para cada usuário, atualize o token de acesso usando o refresh token
    users.forEach(async (user) => {
      console.log(user.displayName)
      console.log(user.refreshToken)
      const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          grant_type: 'refresh_token',
          refresh_token: user.refreshToken, // Use o refresh token do usuário atual
        },
        headers: {
          'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        },
        json: true,
      };

      // Envie a solicitação para atualizar o token de acesso
      request.post(authOptions, async (error, response, body) => {
        console.log(response.statusCode)
        if (!error && response.statusCode === 200) {
          const access_token = body.access_token;

          // Atualize o access token no banco de dados usando o refresh token
          await User.findOneAndUpdate(
            { refreshToken: user.refreshToken },
            { $set: { accessToken: access_token } },
            { new: true }
          );

          console.log(`Token de acesso atualizado para o usuário: ${user.displayName}`);
        } else {
          console.error('Erro ao atualizar o access token para o usuário:', user.displayName);
        }
      });
    });
  } catch (error) {
    console.error('Erro ao atualizar tokens de acesso:', error);
  }
};

module.exports = {
  login,
  callback,
  refreshTokens,
};
