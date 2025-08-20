// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDH9hUEuMlsbPyq5rO5zldBnNQOX26bbG4",
  authDomain: "comp-nuvem-2025.firebaseapp.com",
  databaseURL: "https://comp-nuvem-2025-default-rtdb.firebaseio.com",
  projectId: "comp-nuvem-2025",
  storageBucket: "comp-nuvem-2025.firebasestorage.app",
  messagingSenderId: "60212118707",
  appId: "1:60212118707:web:714faf88ddfd3b536c9cc6"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const rankingBody = document.getElementById('ranking-body');
const rankingLoading = document.getElementById('ranking-loading');
const filterBloco = document.getElementById('filter-bloco');
const filterInsignia = document.getElementById('filter-insignia');
const filterCategoria = document.getElementById('filter-categoria');
const filterGrupo = document.getElementById('filter-grupo');
const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
const btnLimparFiltros = document.getElementById('btn-limpar-filtros');

let alunosData = [];
let gruposData = {};
let currentFilters = {
  bloco: 'all',
  insignia: 'all',
  categoria: 'all',
  grupo: 'all'
};

const categoryWeights = {
  'Diamante': 1.0,
  'Ouro': 0.8,
  'Prata': 0.65,
  'Bronze': 0.5,
  'Cobre': 0.2,
  '0%': 0
};

const badgeEmojis = {
  'Explorador da Nuvem': '🌥️',
  'Arquiteto Cloud Iniciante': '🛠️',
  'Gestor de Custos Cloud': '💸',
  'Segurança Inicial em Cloud': '🔒',
  'Guardião dos Dados': '🛡️',
  'Administrador de Bancos Cloud': '💾',
  'Integrador de APIs e Dados': '🔗',
  'Desenvolvedor Serverless': '⚡',
  'Protetor de APIs': '🔐',
  'Automatizador Cloud': '🤖'
};

const navSlide = () => {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-links li');

  burger.addEventListener('click', () => {
    nav.classList.toggle('nav-active');
    burger.classList.toggle('toggle');
    navLinks.forEach((link, index) => {
      link.style.animation = link.style.animation ? '' : `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
    });
  });
}

const loadData = () => {
  rankingLoading.style.display = 'block';
  rankingLoading.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Carregando dados...`;

  return database.ref('alunos').once('value')
    .then(snapshot => {
      const raw = snapshot.val() || {};
      const alunosDataFromDB = raw.alunos || raw; // normaliza 'alunos/alunos'
      if (!alunosDataFromDB || Object.keys(alunosDataFromDB).length === 0) return showEmptyState();

      alunosData = Object.entries(alunosDataFromDB).map(([id, aluno]) => ({
        id,
        ...aluno,
        score: calculateScore(aluno)
      }));

      return database.ref('grupos').once('value');
    })
    .then(snapshot => {
      gruposData = snapshot?.val() || {};
      populateGruposFilter();
      renderGeneralRanking();
    })
    .catch(error => {
      console.error('Erro ao carregar os dados:', error);
      rankingLoading.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>Erro ao carregar os dados. Por favor, tente novamente mais tarde.</p>
        <p class="error-details">${error.message}</p>
      `;
    });
}

const calculateScore = (aluno) => {
  if (!aluno.insignias) return 0;
  let totalScore = 0, totalWeight = 0;
  Object.entries(aluno.insignias).forEach(([bloco, insignias]) => {
    if (typeof insignias === 'object' && Object.keys(insignias).length === 1 && insignias.pendente === true) return;
    Object.entries(insignias).forEach(([insignia, categoria]) => {
      const categoriaNome = categoria.split(' ')[1] || categoria;
      const weight = categoryWeights[categoriaNome] || 0;
      totalScore += weight;
      totalWeight++;
    });
  });
  return totalWeight ? Math.round((totalScore / totalWeight) * 100) : 0;
}

const populateGruposFilter = () => {
  const gruposSet = new Set();
  alunosData.forEach(aluno => aluno.grupo && gruposSet.add(aluno.grupo));
  while (filterGrupo.options.length > 1) filterGrupo.remove(1);
  Array.from(gruposSet).sort().forEach(grupo => {
    const option = document.createElement('option');
    option.value = grupo;
    option.textContent = grupo;
    filterGrupo.appendChild(option);
  });
}

const renderGeneralRanking = () => {
  const filteredAlunos = filterAlunos(alunosData).sort((a, b) => b.score - a.score);
  rankingBody.innerHTML = '';
  rankingLoading.style.display = 'none';

  if (filteredAlunos.length === 0) {
    rankingBody.innerHTML = `
      <tr><td colspan="4"><div class="empty-state">
        <i class="fas fa-search"></i>
        <p>Nenhum aluno encontrado com os filtros selecionados.</p>
      </div></td></tr>`;
    return;
  }

  filteredAlunos.forEach((aluno, index) => {
    const row = document.createElement('tr');

    const positionCell = document.createElement('td');
    positionCell.textContent = index + 1;
    positionCell.classList.add('position-cell');
    if (index < 3) positionCell.classList.add(`top-position`, `top-${index + 1}`);

    const alunoCell = document.createElement('td');
    alunoCell.textContent = aluno.nome;

    const grupoCell = document.createElement('td');
    grupoCell.textContent = aluno.grupo;

    const insigniasCell = document.createElement('td');
    if (aluno.insignias) {
      const container = document.createElement('div');
      container.classList.add('insignias-container');

      let temInsigniaReal = false;

      Object.entries(aluno.insignias).forEach(([bloco, insignias]) => {
        const blocoDiv = document.createElement('div');
        blocoDiv.classList.add('bloco-insignias');
        const title = document.createElement('h3');
        title.textContent = bloco;

        if (typeof insignias === 'object' && Object.keys(insignias).length === 1 && insignias.pendente === true) {
          const pendente = document.createElement('div');
          pendente.classList.add('badge', 'pendente');
          pendente.innerHTML = `<span class="badge-icon">⏳</span><span class="badge-name">Pendente</span>`;
          blocoDiv.appendChild(title);
          blocoDiv.appendChild(pendente);
        } else if (typeof insignias === 'object') {
          temInsigniaReal = true;
          const badgeList = document.createElement('div');
          badgeList.classList.add('badge-list');
          Object.entries(insignias).forEach(([insignia, categoria]) => {
            createBadgeElement(badgeList, insignia, categoria);
          });
          blocoDiv.appendChild(title);
          blocoDiv.appendChild(badgeList);
        }

        container.appendChild(blocoDiv);
      });

      insigniasCell.appendChild(temInsigniaReal ? container : document.createTextNode('Nenhuma insígnia'));
    } else {
      insigniasCell.textContent = 'Nenhuma insígnia';
    }

    row.append(positionCell, alunoCell, grupoCell, insigniasCell);
    rankingBody.appendChild(row);
  });
}

const createBadgeElement = (container, insignia, categoria) => {
  const categoriaEmoji = categoria.split(' ')[0];
  const categoriaName = categoria.split(' ')[1] || categoria;
  const insigniaEmoji = badgeEmojis[insignia] || '';
  const badge = document.createElement('div');
  badge.classList.add('badge', categoriaName.toLowerCase());
  badge.innerHTML = `
    <span class="badge-icon">${insigniaEmoji}</span>
    <span class="badge-name">${insignia}</span>
    <span class="badge-category">${categoriaEmoji}</span>
  `;
  container.appendChild(badge);
}

const filterAlunos = (alunos) => {
  return alunos.filter(aluno => {
    if (!aluno.insignias && (currentFilters.bloco !== 'all' || currentFilters.insignia !== 'all' || currentFilters.categoria !== 'all')) return false;
    if (currentFilters.grupo !== 'all' && aluno.grupo !== currentFilters.grupo) return false;
    if (currentFilters.bloco !== 'all') {
      if (!aluno.insignias || !aluno.insignias[currentFilters.bloco] || aluno.insignias[currentFilters.bloco].pendente) return false;
    }
    if (currentFilters.insignia === 'all' && currentFilters.categoria === 'all') return true;

    return Object.entries(aluno.insignias || {}).some(([bloco, insignias]) => {
      if (currentFilters.bloco !== 'all' && bloco !== currentFilters.bloco) return false;
      if (typeof insignias !== 'object' || insignias.pendente) return false;

      return Object.entries(insignias).some(([insignia, categoria]) => {
        if (currentFilters.insignia !== 'all' && insignia !== currentFilters.insignia) return false;
        if (currentFilters.categoria !== 'all' && (categoria.split(' ')[1] || categoria) !== currentFilters.categoria) return false;
        return true;
      });
    });
  });
}

const showEmptyState = () => {
  rankingLoading.style.display = 'none';
  rankingBody.innerHTML = `
    <tr><td colspan="4"><div class="empty-state">
      <i class="fas fa-database"></i>
      <p>Nenhum dado de aluno disponível no momento.</p>
    </div></td></tr>`;
}

const applyFilters = () => {
  currentFilters = {
    bloco: filterBloco.value,
    insignia: filterInsignia.value,
    categoria: filterCategoria.value,
    grupo: filterGrupo.value
  };
  renderGeneralRanking();
}

const clearFilters = () => {
  filterBloco.value = 'all';
  filterInsignia.value = 'all';
  filterCategoria.value = 'all';
  filterGrupo.value = 'all';
  applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
  navSlide();
  btnAplicarFiltros.addEventListener('click', applyFilters);
  btnLimparFiltros.addEventListener('click', clearFilters);
  loadData();
});
