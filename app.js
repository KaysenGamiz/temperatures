const express = require('express');
const mongoose = require('mongoose');
const router = require('./controllers/router'); // Asegúrate que la ruta sea correcta
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.CONN)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch((err) => console.error('❌ Error al conectar a MongoDB:', err));

// Ruta base
app.use('/', router);
app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
