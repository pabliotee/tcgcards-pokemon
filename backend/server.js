const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = 'https://api.pokemontcg.io/v2/cards';

// 🔑 INSIRA SUA API KEY AQUI (Gerada em https://pokemontcg.io)
const API_KEY = '4aef9f18-8181-4062-8ee0-1b550ec73680'; 

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/cards', async (req, res) => {
  try {
    const { page = 1, pageSize = 25, q } = req.query;

    const params = {
      page: Number(page),
      pageSize: Number(pageSize)
    };

    if (q && String(q).trim() !== '') {
      params.q = String(q).trim();
    }

    console.log('📡 [BACKEND] Consultando API Oficial:', params);

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    if (API_KEY && API_KEY !== 'SUA_CHAVE_AQUI_SE_TIVER') {
      headers['X-Api-Key'] = API_KEY;
    }

    const apiResponse = await axios.get(API_URL, {
      params,
      headers,
      timeout: 15000 // 15 segundos de limite
    });

    res.json(apiResponse.data);

  } catch (error) {
    const status = error.response?.status || 500;
    const errorDetails = error.response?.data || error.message;
    
    console.error(`❌ [BACKEND] A API Oficial falhou com status ${status}:`, errorDetails);

    // Retorna um JSON amigável para o front não travar a aplicação inteira
    res.status(status).json({ 
      error: 'A API Oficial do Pokémon TCG está instável no momento.',
      detalhes: errorDetails
    });
  }
});

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});