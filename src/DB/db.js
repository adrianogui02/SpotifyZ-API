const mongoose = require('mongoose');

const DB_URI='mongodb+srv://admin:12345@walletapi.lsfvt4o.mongodb.net/SpotifyZ'

mongoose.connect(DB_URI, {

  useUnifiedTopology: true,
  useCreateIndex: true,

});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Erro na conexão ao MongoDB:'));
db.once('open', () => {
  console.log('Conexão ao MongoDB estabelecida com sucesso.');
});

