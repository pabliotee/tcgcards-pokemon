require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = 'https://api.pokemontcg.io/v2/cards';
const API_KEY = process.env.POKEMON_TCG_API_KEY;

const MAX_PAGE_SIZE = 250;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestTimestampsByIp = new Map();

function estaLimitadoPorTaxa(ip) {
  const agora = Date.now();
  const timestamps = (requestTimestampsByIp.get(ip) || []).filter(t => agora - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(agora);
  requestTimestampsByIp.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/cards', async (req, res) => {
  if (estaLimitadoPorTaxa(req.ip)) {
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
  }

  const { page = 1, pageSize = 25, q } = req.query;

  const parsedPage = Number.parseInt(page, 10);
  const parsedPageSize = Number.parseInt(pageSize, 10);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return res.status(400).json({ error: 'Parâmetro "page" inválido.' });
  }

  if (!Number.isInteger(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > MAX_PAGE_SIZE) {
    return res.status(400).json({ error: `Parâmetro "pageSize" inválido (máximo ${MAX_PAGE_SIZE}).` });
  }

  try {
    const params = {
      page: parsedPage,
      pageSize: parsedPageSize
    };

    if (q && String(q).trim() !== '') {
      params.q = String(q).trim();
    }

    console.log('📡 [BACKEND] Consultando API Oficial:', params);

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    if (API_KEY) {
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

    console.error(`❌ [BACKEND] A API Oficial falhou com status ${status}:`, error.response?.data || error.message);

    // Retorna um JSON amigável para o front sem expor detalhes internos da API upstream
    res.status(status).json({
      error: 'A API Oficial do Pokémon TCG está instável no momento.'
    });
  }
});

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});