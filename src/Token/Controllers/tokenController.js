const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const User = require('../../DB/Models/tokens');
require('dotenv')
dotenv.config()

const client_id = process.env.client_id
const client_secret = process.env.client_secret
const redirect_uri = process.env.redirect_uri
const stateKey = process.env.stateKey


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
  
    const scope = 'user-read-private user-read-email user-read-playback-state user-library-read user-top-read user-read-recently-played user-modify-playback-state user-read-playback-position user-read-playback-state user-read-currently-playing user-follow-read user-follow-modify playlist-read-collaborative playlist-modify-public playlist-read-private playlist-modify-private ugc-image-upload user-read-playback-position user-read-private user-read-email user-library-modify'; 
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

const refresh_token = (req, res) => {
    const { refresh_token }  = req.params;
    console.log('Entrou na rota de atualização de token');
    console.log('Refresh Token:', refresh_token);
  
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      },
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      },
      json: true,
    };
  
    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token;
  
        // Atualize o access token no banco de dados usando o refresh token
        User.findOneAndUpdate(
          { refreshToken: refresh_token },
          { $set: { accessToken: access_token } },
          { new: true },
          (err, user) => {
            if (err) {
              console.error('Erro ao atualizar o access token:', err);
              res.status(500).json({ error: 'server_error' });
            } else {
              res.status(200).json({ access_token: access_token });
            }
          }
        );
      } else {
        res.status(response.statusCode).json(body);
      }
    });
};

module.exports = {
  login,
  callback,
  refresh_token,
};
