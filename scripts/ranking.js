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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const rankingBody = document.getElementById('ranking-body');
const rankingLoading = document.getElementById('ranking-loading');
const filterBloco = document.getElementById('filter-bloco');
const filterInsignia = document.getElementById('filter-insignia');
const filterCategoria = document.getElementById('filter-categoria');
const filterGrupo = document.getElementById('filter-grupo');
const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
const btnLimparFiltros = document.getElementById('btn-limpar-filtros');

// Global data store
let alunosData = [];
let gruposData = {};
let currentFilters = {
  bloco: 'all',
  insignia: 'all',
  categoria: 'all',
  grupo: 'all'
};

// Category weights (for score calculation)
const categoryWeights = {
  'Diamante': 1.0,
  'Ouro': 0.8,
  'Prata': 0.65,
  'Bronze': 0.5,
  'Cobre': 0.2,
  '0%': 0
};

// Badge emojis
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

// Category emojis
const categoryEmojis = {
  'Diamante': '💎',
  'Ouro': '🥇',
  'Prata': '🥈',
  'Bronze': '🥉',
  'Cobre': '🟫',
  '0%': '🚫'
};

// Mobile Navigation Toggle
const navSlide = () => {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-links li');

  burger.addEventListener('click', () => {
    nav.classList.toggle('nav-active');
    burger.classList.toggle('toggle');
    
    navLinks.forEach((link, index) => {
      if (link.style.animation) {
        link.style.animation = '';
      } else {
        link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
      }
    });
  });
}

// Load all data from Firebase
const loadData = () => {
  // Show loading indicator
  rankingLoading.style.display = 'block';
  rankingLoading.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Carregando dados...`;

  // Get alunos data
  return database.ref('alunos').once('value')
    .then(snapshot => {
      const alunosDataFromDB = snapshot.val();

      if (!alunosDataFromDB) {
        showEmptyState();
        return;
      }

      // Transform data to array and add id
      alunosData = Object.entries(alunosDataFromDB).map(([id, aluno]) => ({
        id,
        ...aluno,
        score: calculateScore(aluno)
      }));

      // Get grupos data
      return database.ref('grupos').once('value');
    })
    .then(snapshot => {
      if (snapshot) {
        gruposData = snapshot.val() || {};
        populateGruposFilter();
        renderGeneralRanking();
      }
    })
    .catch(error => {
      console.error('Error loading data:', error);
      rankingLoading.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>Erro ao carregar os dados. Por favor, tente novamente mais tarde.</p>
        <p class="error-details">${error.message}</p>
      `;
    });
}

// Calculate student score based on insignias
const calculateScore = (aluno) => {
  if (!aluno.insignias) return 0;
  
  let totalScore = 0;
  let totalWeight = 0;
  
  // Calculate score for each block
  Object.entries(aluno.insignias).forEach(([bloco, insignias]) => {
    // Skip pending blocks
    if (insignias.pendente) return;
    
    if (typeof insignias === 'object') {
      Object.entries(insignias).forEach(([insignia, categoria]) => {
        // Extract category name from the string (e.g., "🥇 Ouro" -> "Ouro")
        const categoriaParts = categoria.split(' ');
        const categoriaNome = categoriaParts.length > 1 ? categoriaParts[1] : categoria;
        const weight = categoryWeights[categoriaNome] || 0;
        totalScore += weight;
        totalWeight += 1;
      });
    }
  });
  
  if (totalWeight === 0) return 0;
  
  // Return average score (0-100)
  return Math.round((totalScore / totalWeight) * 100);
}

// Populate grupos filter
const populateGruposFilter = () => {
  // Get unique grupo names from alunos data
  const gruposSet = new Set();
  
  alunosData.forEach(aluno => {
    if (aluno.grupo) {
      gruposSet.add(aluno.grupo);
    }
  });
  
  // Clear existing options except the first one
  while (filterGrupo.options.length > 1) {
    filterGrupo.remove(1);
  }
  
  // Create and append options
  const gruposArray = Array.from(gruposSet).sort();
  gruposArray.forEach(grupo => {
    const option = document.createElement('option');
    option.value = grupo;
    option.textContent = grupo;
    filterGrupo.appendChild(option);
  });
}

// Render the general ranking table
const renderGeneralRanking = () => {
  const filteredAlunos = filterAlunos(alunosData);
  filteredAlunos.sort((a, b) => b.score - a.score);
  
  rankingBody.innerHTML = '';
  rankingLoading.style.display = 'none';
  
  if (filteredAlunos.length === 0) {
    rankingBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-state">
            <i class="fas fa-search"></i>
            <p>Nenhum aluno encontrado com os filtros selecionados.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  filteredAlunos.forEach((aluno, index) => {
    const row = document.createElement('tr');
    
    // Position Cell
    const positionCell = document.createElement('td');
    positionCell.classList.add('position-cell');
    if (index < 3) positionCell.classList.add(`top-position`, `top-${index+1}`);
    positionCell.textContent = index + 1;
    
    // Aluno Cell
    const alunoCell = document.createElement('td');
    alunoCell.textContent = aluno.nome;
    
    // Grupo Cell
    const grupoCell = document.createElement('td');
    grupoCell.textContent = aluno.grupo;
    
    // Insígnias Cell
    const insigniasCell = document.createElement('td');
    
    if (aluno.insignias) {
      const insigniasContainer = document.createElement('div');
      insigniasContainer.classList.add('insignias-container');
      
      // Process insignias by block
      Object.entries(aluno.insignias).forEach(([bloco, insignias]) => {
        const blocoDiv = document.createElement('div');
        blocoDiv.classList.add('bloco-insignias');
        
        const blocoTitle = document.createElement('h3');
        blocoTitle.textContent = bloco;
        
        // Check if block is pending
        if (insignias.pendente) {
          const pendenteBadge = document.createElement('div');
          pendenteBadge.classList.add('badge', 'pendente');
          pendenteBadge.innerHTML = `
            <span class="badge-icon">⏳</span>
            <span class="badge-name">Pendente</span>
          `;
          blocoDiv.appendChild(blocoTitle);
          blocoDiv.appendChild(pendenteBadge);
        } else if (typeof insignias === 'object') {
          const badgeList = document.createElement('div');
          badgeList.classList.add('badge-list');
          
          Object.entries(insignias).forEach(([insignia, categoria]) => {
            createBadgeElement(badgeList, insignia, categoria);
          });
          
          blocoDiv.appendChild(blocoTitle);
          blocoDiv.appendChild(badgeList);
        }
        
        insigniasContainer.appendChild(blocoDiv);
      });
      
      insigniasCell.appendChild(insigniasContainer);
    } else {
      insigniasCell.textContent = 'Nenhuma insígnia';
    }
    
    row.appendChild(positionCell);
    row.appendChild(alunoCell);
    row.appendChild(grupoCell);
    row.appendChild(insigniasCell);
    
    rankingBody.appendChild(row);
  });
}

// Create badge element
const createBadgeElement = (container, insignia, categoria) => {
  const categoriaParts = categoria.split(' ');
  const categoriaEmoji = categoriaParts[0];
  const categoriaName = categoriaParts.slice(1).join(' ');
  
  const insigniaEmoji = badgeEmojis[insignia] || '';
  
  const badge = document.createElement('div');
  badge.classList.add('badge');
  badge.classList.add(categoriaName.toLowerCase());
  
  badge.innerHTML = `
    <span class="badge-icon">${insigniaEmoji}</span>
    <span class="badge-name">${insignia}</span>
    <span class="badge-category">${categoriaEmoji}</span>
  `;
  
  container.appendChild(badge);
}

// Filter alunos based on current filters
const filterAlunos = (alunos) => {
  return alunos.filter(aluno => {
    // Skip filtering if all filters are set to 'all'
    if (currentFilters.bloco === 'all' &&
        currentFilters.insignia === 'all' &&
        currentFilters.categoria === 'all' &&
        currentFilters.grupo === 'all') {
      return true;
    }
    
    // Filter by group
    if (currentFilters.grupo !== 'all' && aluno.grupo !== currentFilters.grupo) {
      return false;
    }
    
    // If no insignias, exclude from filtered results if insignia or bloco filters are active
    if (!aluno.insignias && (currentFilters.bloco !== 'all' || currentFilters.insignia !== 'all' || currentFilters.categoria !== 'all')) {
      return false;
    }
    
    // Filter by bloco
    if (currentFilters.bloco !== 'all') {
      if (!aluno.insignias || !aluno.insignias[currentFilters.bloco] || aluno.insignias[currentFilters.bloco].pendente) {
        return false;
      }
    }
    
    // Filter by insignia and categoria
    if (currentFilters.insignia !== 'all' || currentFilters.categoria !== 'all') {
      if (!aluno.insignias) return false;
      
      let matchesInsigniaAndCategoria = false;
      
      Object.entries(aluno.insignias).forEach(([bloco, insignias]) => {
        if (currentFilters.bloco !== 'all' && bloco !== currentFilters.bloco) {
          return;
        }
        
        // Skip pending blocks
        if (insignias.pendente) return;
        
        if (typeof insignias === 'object') {
          Object.entries(insignias).forEach(([insignia, categoria]) => {
            if (currentFilters.insignia !== 'all' && insignia !== currentFilters.insignia) {
              return;
            }
            
            if (currentFilters.categoria !== 'all') {
              const categoriaParts = categoria.split(' ');
              const categoriaNome = categoriaParts.length > 1 ? categoriaParts[1] : categoria;
              if (categoriaNome !== currentFilters.categoria) {
                return;
              }
            }
            
            matchesInsigniaAndCategoria = true;
          });
        }
      });
      
      if (!matchesInsigniaAndCategoria) {
        return false;
      }
    }
    
    return true;
  });
}

// Show empty state
const showEmptyState = () => {
  rankingLoading.style.display = 'none';
  
  rankingBody.innerHTML = `
    <tr>
      <td colspan="4">
        <div class="empty-state">
          <i class="fas fa-database"></i>
          <p>Nenhum dado de aluno disponível no momento.</p>
        </div>
      </td>
    </tr>
  `;
}

// Apply filters
const applyFilters = () => {
  currentFilters = {
    bloco: filterBloco.value,
    insignia: filterInsignia.value,
    categoria: filterCategoria.value,
    grupo: filterGrupo.value
  };
  
  renderGeneralRanking();
}

// Clear filters
const clearFilters = () => {
  filterBloco.value = 'all';
  filterInsignia.value = 'all';
  filterCategoria.value = 'all';
  filterGrupo.value = 'all';
  
  applyFilters();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  navSlide();
  
  // Add filter event listeners
  btnAplicarFiltros.addEventListener('click', applyFilters);
  btnLimparFiltros.addEventListener('click', clearFilters);
  
  // Load initial data
  loadData();
});
