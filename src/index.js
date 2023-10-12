const express = require('express');
const cookieParser = require('cookie-parser');
const tokenRoutes = require('./Token/Routes/tokenRoutes');
const musicRoutes = require('./Music/Routes/musicRoutes');
const mongoose = require('mongoose');
const cors = require('cors')

const DB_URI='mongodb+srv://admin:12345@walletapi.lsfvt4o.mongodb.net/SpotifyZ'
const app = express();
app.use(cookieParser());
app.use(cors());
app.use('/auth', tokenRoutes);
app.use('/spotifyz', musicRoutes);

const PORT = 8888;
app.listen(PORT, () => {

    mongoose.connect(DB_URI, {
    useUnifiedTopology: true,
    });

    const db = mongoose.connection;

    db.on('error', console.error.bind(console, 'Erro na conexão ao MongoDB:'));
    db.once('open', () => {
    console.log('Conexão ao MongoDB estabelecida com sucesso.');
    });

    console.log(`Server is running on port ${PORT}`);

});