const API_URL = '/api/cards';
const CURRENCY_API = 'https://economia.awesomeapi.com.br/last/USD-BRL';
const PAGE_SIZE = 25;

let paginaAtual = 1;
let buscaAtual = '';
let cotacaoDolar = 5.0;
let cartassAtuais = [];
let totalCartasEncontradas = 0;
let requestSeq = 0;

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const paginationContainer = document.getElementById('paginationContainer');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const pageInfo = document.getElementById('pageInfo');
const filterRarity = document.getElementById('filterRarity');
const filterSupertype = document.getElementById('filterSupertype');
const sortOrder = document.getElementById('sortOrder');

document.addEventListener('DOMContentLoaded', async () => {
  await buscarCotacaoDolar();
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        mudarPagina(0);
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModalForcado();
    }
  });

  buscarCartas('', 1);
});

async function buscarCotacaoDolar() {
  try {
    const res = await fetch(CURRENCY_API);
    if (!res.ok) throw new Error('Erro na resposta da moeda');
    const data = await res.json();
    const bid = data.USDBRL && parseFloat(data.USDBRL.bid);
    if (Number.isFinite(bid) && bid > 0) {
      cotacaoDolar = bid;
    }
  } catch (err) {
    console.warn('Falha ao obter cotação do dólar. Usando taxa padrão:', err);
  }
}

function alternarTema() {
  const html = document.documentElement;
  const temaAtual = html.getAttribute('data-theme');
  const novoTema = temaAtual === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', novoTema);
  
  const btnTheme = document.getElementById('themeToggle');
  if (btnTheme) {
    btnTheme.innerText = novoTema === 'dark' ? '☀️ Tema Claro' : '🌙 Tema Escuro';
  }
}

async function mudarPagina(direcao) {
  if (direcao === 0) {
    paginaAtual = 1;
    buscaAtual = searchInput ? searchInput.value.trim() : '';
  } else {
    paginaAtual += direcao;
  }

  if (paginaAtual < 1) paginaAtual = 1;
  await buscarCartas(buscaAtual, paginaAtual);
}

function normalizarTexto(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s'-]/gi, '')
    .trim();
}

// Constrói a sintaxe válida aceita pela API v2 sem corromper com asteriscos
function construirQueryBusca(nome) {
  let queryParts = [];

  if (nome && nome.trim().length > 0) {
    const nomeLimpo = normalizarTexto(nome);
    if (nomeLimpo.length > 0) {
      // Entre aspas para que nomes com múltiplas palavras fiquem escopados ao campo name
      queryParts.push(`name:"${nomeLimpo}"`);
    }
  }

  const raridade = filterRarity ? filterRarity.value : '';
  if (raridade && raridade.trim() !== '') {
    queryParts.push(`rarity:"${raridade}"`);
  }
  
  const supertipo = filterSupertype ? filterSupertype.value : '';
  if (supertipo && supertipo.trim() !== '') {
    let supertypeVal = supertipo;
    if (supertipo.toLowerCase() === 'pokemon' || supertipo.toLowerCase() === 'pokémon') {
      supertypeVal = 'Pokémon';
    }
    queryParts.push(`supertype:"${supertypeVal}"`);
  }

  return queryParts.join(' ');
}

async function buscarCartas(nome, pagina = 1) {
  mostrarCarregando();
  const seq = ++requestSeq;

  try {
    const query = construirQueryBusca(nome);
    let url = `${API_URL}?page=${pagina}&pageSize=${PAGE_SIZE}`;

    if (query && query.trim().length > 0) {
      url += `&q=${encodeURIComponent(query)}`;
    }

    console.log('🔗 Solicitando ao backend:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Resposta de erro do servidor (${response.status}):`, errorText);
      throw new Error(`Erro no servidor (${response.status})`);
    }

    const data = await response.json();

    if (seq !== requestSeq) return; // uma requisição mais recente já está em andamento; descarta esta resposta obsoleta

    const cartas = data.data || [];
    totalCartasEncontradas = data.totalCount || cartas.length;

    if (cartas.length === 0) {
      if (pagina > 1) {
        alert('Não há mais cartas para serem exibidas.');
        paginaAtual--;
        renderizarPaginacao(cartassAtuais.length);
        mostrarResultados(cartassAtuais);
        return;
      } else {
        mostrarMensagemVazia();
        return;
      }
    }

    cartassAtuais = cartas;

    aplicarOrdenacao();
    mostrarResultados(cartassAtuais);
    renderizarPaginacao(cartassAtuais.length);

  } catch (err) {
    if (seq !== requestSeq) return;
    console.error('❌ Erro na comunicação Front-Back:', err);
    mostrarMensagemErro();
  }
}

function aplicarOrdenacao() {
  const ordem = sortOrder ? sortOrder.value : '';
  if (!ordem) return;

  cartassAtuais.sort((a, b) => {
    const precoA = obterPrecoEmBrl(a);
    const precoB = obterPrecoEmBrl(b);
    return ordem === 'price-desc' ? precoB - precoA : precoA - precoB;
  });
}

function aplicarFiltros() {
  mudarPagina(0);
}

function mostrarCarregando() {
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="loading-spinner">Carregando cartas do servidor...</div>';
  }
}

function mostrarMensagemVazia() {
  if (resultsContainer) {
    resultsContainer.innerHTML = '<p class="no-results">Nenhuma carta encontrada com os termos selecionados.</p>';
  }
  if (paginationContainer) {
    paginationContainer.style.display = 'none';
  }
}

function mostrarMensagemErro() {
  if (resultsContainer) {
    resultsContainer.innerHTML = '<p class="error-msg">Não foi possível carregar as cartas. Verifique o servidor local.</p>';
  }
  if (paginationContainer) {
    paginationContainer.style.display = 'none';
  }
}

function mostrarResultados(cartas) {
  if (!resultsContainer) return;
  resultsContainer.innerHTML = '';

  cartas.forEach(carta => {
    const precoUsd = obterPrecoEmUsd(carta);
    const precoBrl = precoUsd * cotacaoDolar;
    const imagem = carta.images?.small || '';
    const nomeSeguro = escaparHtml(carta.name);
    const colecaoSegura = escaparHtml(carta.set?.name || 'Coleção Desconhecida');

    const cardEl = document.createElement('div');
    cardEl.className = 'card-item';
    cardEl.onclick = () => abrirModal(carta);

    cardEl.addEventListener('mousemove', (e) => {
      const rect = cardEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;

      cardEl.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
      cardEl.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
      cardEl.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
    });

    cardEl.addEventListener('mouseleave', () => {
      cardEl.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });

    cardEl.innerHTML = `
      <img src="${imagem}" alt="${nomeSeguro}" loading="lazy">
      <div class="card-title">${nomeSeguro}</div>
      <div class="card-set">${colecaoSegura}</div>
      <div class="price-badge">R$ ${precoBrl.toFixed(2)}</div>
      <div class="price-usd">($ ${precoUsd.toFixed(2)} USD)</div>
    `;

    resultsContainer.appendChild(cardEl);
  });
}

function renderizarPaginacao(quantidadeRetornada) {
  if (!paginationContainer) return;
  
  paginationContainer.style.display = 'flex';
  if (pageInfo) {
    pageInfo.innerText = `Página ${paginaAtual}`;
  }

  if (btnPrev) {
    btnPrev.disabled = paginaAtual <= 1;
  }

  if (btnNext) {
    const totalPaginasEstimado = Math.ceil(totalCartasEncontradas / PAGE_SIZE);
    btnNext.disabled = quantidadeRetornada < PAGE_SIZE || paginaAtual >= totalPaginasEstimado;
  }
}

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extrairPrecoUsd(valores) {
  if (!valores) return null;
  if (valores.market != null) return valores.market;
  if (valores.mid != null) return valores.mid;
  return null;
}

function obterPrecoEmUsd(carta) {
  const prices = carta.tcgplayer?.prices;
  if (!prices) return 0;

  const candidatos = [prices.holofoil, prices.normal, prices.reverseHolofoil, prices.unlimitedHolofoil];
  for (const variante of candidatos) {
    const preco = extrairPrecoUsd(variante);
    if (preco != null) return preco;
  }
  return 0;
}

function obterPrecoEmBrl(carta) {
  const usd = obterPrecoEmUsd(carta);
  return usd * cotacaoDolar;
}

function abrirModal(carta) {
  const modal = document.getElementById('cardModal');
  if (!modal) return;

  const imgEl = document.getElementById('modalCardImage');
  const nameEl = document.getElementById('modalCardName');
  const setEl = document.getElementById('modalCardSet');
  const rarityEl = document.getElementById('modalCardRarity');
  const supertypeEl = document.getElementById('modalCardSupertype');
  const artistEl = document.getElementById('modalCardArtist');
  const detailsContainer = document.getElementById('modalPriceDetails');

  if (imgEl) imgEl.src = carta.images?.large || carta.images?.small || '';
  if (nameEl) nameEl.innerText = carta.name;
  if (setEl) setEl.innerText = carta.set?.name || '-';
  if (rarityEl) rarityEl.innerText = carta.rarity || '-';
  if (supertypeEl) supertypeEl.innerText = carta.supertype || '-';
  if (artistEl) artistEl.innerText = carta.artist || 'Desconhecido';

  if (detailsContainer) {
    detailsContainer.innerHTML = '';

    if (carta.tcgplayer?.prices) {
      const prices = carta.tcgplayer.prices;
      for (const [variacao, valores] of Object.entries(prices)) {
        const precoUsd = extrairPrecoUsd(valores) ?? 0;
        const precoBrl = precoUsd * cotacaoDolar;

        const row = document.createElement('div');
        row.className = 'price-row';
        row.innerHTML = `
          <span><strong>${escaparHtml(variacao.toUpperCase())}:</strong></span>
          <span>R$ ${precoBrl.toFixed(2)} ($ ${precoUsd.toFixed(2)})</span>
        `;
        detailsContainer.appendChild(row);
      }
    } else {
      detailsContainer.innerHTML = '<p>Preços indisponíveis para esta carta no TCGPlayer.</p>';
    }
  }

  modal.style.display = 'flex';
}

function fecharModal(event) {
  if (event && event.target.id === 'cardModal') {
    fecharModalForcado();
  }
}

function fecharModalForcado() {
  const modal = document.getElementById('cardModal');
  if (modal) {
    modal.style.display = 'none';
  }
}