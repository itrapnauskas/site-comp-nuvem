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
const bloco1Body = document.getElementById('bloco1-body');
const bloco2Body = document.getElementById('bloco2-body');
const bloco3Body = document.getElementById('bloco3-body');
const bloco4Body = document.getElementById('bloco4-body');
const bloco5Body = document.getElementById('bloco5-body');
const filterBloco = document.getElementById('filter-bloco');
const filterInsignia = document.getElementById('filter-insignia');
const filterCategoria = document.getElementById('filter-categoria');
const filterGrupo = document.getElementById('filter-grupo');
const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
const tabButtons = document.querySelectorAll('.tab-button');

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
  'Automatizador Cloud': '🤖',
  'Monitor de Desempenho': '📊',
  'Escalador de Serviços': '📈',
  'Otimização e Custos': '💡',
  'Defensor da Nuvem': '🛡️',
  'Especialista em Cloud Security': '🔑'
};

// Category emojis
const categoryEmojis = {
  'Diamante': '💎',
  'Ouro': '🏅',
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

// Tab switching functionality
const initTabs = () => {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      const tabId = button.dataset.tab;
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Load all data from Firebase
const loadData = () => {
  // Show loading indicator
  rankingLoading.style.display = 'block';
  
  // Get alunos data
  database.ref('alunos').once('value')
    .then(snapshot => {
      const data = snapshot.val();
      
      if (!data) {
        showEmptyState();
        return;
      }
      
      // Transform data to array and add id
      alunosData = Object.entries(data).map(([id, aluno]) => ({
        id,
        ...aluno,
        score: calculateScore(aluno) // Calculate score for each student
      }));
      
      // Get grupos data
      return database.ref('grupos').once('value');
    })
    .then(snapshot => {
      if (snapshot) {
        gruposData = snapshot.val() || {};
        
        // Populate grupos filter
        populateGruposFilter();
        
        // Render all tables
        renderGeneralRanking();
        renderBlocoTables();
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
  
  // Calculate score for each insignia
  Object.entries(aluno.insignias).forEach(([bloco, insignias]) => {
    if (typeof insignias === 'object') {
      // Handle new format (with individual categories per insignia)
      Object.entries(insignias).forEach(([insignia, categoria]) => {
        // Extract category name from the string (e.g., "💎 Diamante" -> "Diamante")
        const categoriaNome = categoria.split(' ')[1] || categoria;
        const weight = categoryWeights[categoriaNome] || 0;
        
        // Get insignia weight from insígnias definition (to be implemented)
        const insigniaWeight = 1; // Default weight for now
        
        totalScore += weight * insigniaWeight;
        totalWeight += insigniaWeight;
      });
    } else {
      // Handle old format (single category per block)
      const categoriaNome = insignias.split(' ')[1] || insignias;
      const weight = categoryWeights[categoriaNome] || 0;
      
      totalScore += weight;
      totalWeight += 1;
    }
  });
  
  // If there are no weights, return 0
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
  // Apply current filters
  const filteredAlunos = filterAlunos(alunosData);
  
  // Sort by score (descending)
  filteredAlunos.sort((a, b) => b.score - a.score);
  
  // Clear previous content
  rankingBody.innerHTML = '';
  
  // Hide loading indicator
  rankingLoading.style.display = 'none';
  
  // If no students match filters, show empty state
  if (filteredAlunos.length === 0) {
    rankingBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <i class="fas fa-search"></i>
            <p>Nenhum aluno encontrado com os filtros selecionados.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Render each student
  filteredAlunos.forEach((aluno, index) => {
    const row = document.createElement('tr');
    
    // Position Cell
    const positionCell = document.createElement('td');
    positionCell.classList.add('position-cell');
    if (index < 3) positionCell.classList.add(`top-position`, `top-${index+1}`);
    positionCell.textContent = index + 1;
    
    // Aluno Cell
    const alunoCell = document.createElement('td');
    alunoCell.textContent = aluno.nome || 'Sem nome';
    
    // Grupo Cell
    const grupoCell = document.createElement('td');
    grupoCell.textContent = aluno.grupo || 'Sem grupo';
    
    // Score Cell
    const scoreCell = document.createElement('td');
    scoreCell.classList.add('score-cell');
    scoreCell.textContent = aluno.score;
    
    // Insignias Cell
    const insigniasCell = document.createElement('td');
    
    if (aluno.insignias) {
      const badgeList = document.createElement('div');
      badgeList.classList.add('badge-list');
      
      // Process all insignias
      Object.entries(aluno.insignias).forEach(([bloco, insignias]) => {
        if (typeof insignias === 'object') {
          // New format (individual categories per insignia)
          Object.entries(insignias).forEach(([insignia, categoria]) => {
            createBadgeElement(badgeList, insignia, categoria);
          });
        } else {
          // Old format (single category per block)
          createBadgeElement(badgeList, bloco, insignias);
        }
      });
      
      insigniasCell.appendChild(badgeList);
    } else {
      insigniasCell.textContent = 'Nenhuma insígnia';
    }
    
    // Append cells to row
    row.appendChild(positionCell);
    row.appendChild(alunoCell);
    row.appendChild(grupoCell);
    row.appendChild(scoreCell);
    row.appendChild(insigniasCell);
    
    // Append row to table
    rankingBody.appendChild(row);
  });
}

// Create badge element for insignias
const createBadgeElement = (container, insignia, categoria) => {
  // Extract category name from the string (e.g., "💎 Diamante" -> "Diamante")
  const categoriaParts = categoria.split(' ');
  const categoriaName = categoriaParts.length > 1 ? categoriaParts[1] : categoria;
  const categoriaEmoji = categoriaParts.length > 1 ? categoriaParts[0] : categoryEmojis[categoriaName] || '';
  
  // Get badge emoji
  const insigniaEmoji = badgeEmojis[insignia] || '';
  
  // Create badge element
  const badge = document.createElement('div');
  badge.classList.add('badge');
  badge.classList.add(categoriaName.toLowerCase());
  
  // Add badge content
  badge.innerHTML = `
    <span class="badge-icon">${insigniaEmoji}</span>
    <span class="badge-name">${insignia}</span>
    <span class="badge-category">${categoriaEmoji}</span>
  `;
  
  container.appendChild(badge);
}

// Render the bloco tables
const renderBlocoTables = () => {
  // Render each bloco table
  renderBlocoTable(bloco1Body, 'Bloco1', [
    'Explorador da Nuvem',
    'Arquiteto Cloud Iniciante',
    'Gestor de Custos Cloud',
    'Segurança Inicial em Cloud'
  ]);
  
  renderBlocoTable(bloco2Body, 'Bloco2', [
    'Guardião dos Dados',
    'Administrador de Bancos Cloud',
    'Integrador de APIs e Dados'
  ]);
  
  renderBlocoTable(bloco3Body, 'Bloco3', [
    'Desenvolvedor Serverless',
    'Protetor de APIs',
    'Automatizador Cloud'
  ]);
  
  renderBlocoTable(bloco4Body, 'Bloco4', [
    'Monitor de Desempenho',
    'Escalador de Serviços',
    'Otimização e Custos'
  ]);
  
  renderBlocoTable(bloco5Body, 'Bloco5', [
    'Defensor da Nuvem',
    'Especialista em Cloud Security'
  ]);
}

// Render specific bloco table
const renderBlocoTable = (tableBody, blocoId, insignias) => {
  // Apply filters
  let filteredAlunos = filterAlunos(alunosData);
  
  // Filter by bloco presence (if any insignia exists for this bloco)
  filteredAlunos = filteredAlunos.filter(aluno => {
    if (!aluno.insignias) return false;
    
    // Check if student has any insignia in this bloco
    return aluno.insignias[blocoId] !== undefined;
  });
  
  // Calculate bloco score for each student
  filteredAlunos.forEach(aluno => {
    aluno.blocoScore = calculateBlocoScore(aluno, blocoId, insignias);
  });
  
  // Sort by bloco score (descending)
  filteredAlunos.sort((a, b) => b.blocoScore - a.blocoScore);
  
  // Clear previous content
  tableBody.innerHTML = '';
  
  // If no students match filters, show empty state
  if (filteredAlunos.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${insignias.length + 2}">
          <div class="empty-state">
            <i class="fas fa-search"></i>
            <p>Nenhum aluno encontrado com os filtros selecionados.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Render each student
  filteredAlunos.forEach((aluno, index) => {
    const row = document.createElement('tr');
    
    // Position Cell
    const positionCell = document.createElement('td');
    positionCell.classList.add('position-cell');
    if (index < 3) positionCell.classList.add(`top-position`, `top-${index+1}`);
    positionCell.textContent = index + 1;
    
    // Aluno Cell
    const alunoCell = document.createElement('td');
    alunoCell.textContent = aluno.nome || 'Sem nome';
    
    // Append position and aluno cells
    row.appendChild(positionCell);
    row.appendChild(alunoCell);
    
    // Insignia Cells
    insignias.forEach(insignia => {
      const insigniaCell = document.createElement('td');
      insigniaCell.classList.add('insignia-cell');
      
      // Check if student has this insignia
      if (aluno.insignias && aluno.insignias[blocoId]) {
        if (typeof aluno.insignias[blocoId] === 'object') {
          // New format (individual categories per insignia)
          const categoria = aluno.insignias[blocoId][insignia];
          
          if (categoria) {
            // Extract category name and emoji
            const categoriaParts = categoria.split(' ');
            const categoriaEmoji = categoriaParts.length > 1 ? categoriaParts[0] : categoryEmojis[categoria] || '';
            
            insigniaCell.textContent = categoriaEmoji;
            insigniaCell.title = `${insignia}: ${categoria}`;
          } else {
            insigniaCell.textContent = '—';
            insigniaCell.title = 'Insígnia não conquistada';
          }
        } else {
          // Old format (single category for all insignias)
          insigniaCell.textContent = categoryEmojis[aluno.insignias[blocoId]] || aluno.insignias[blocoId];
          insigniaCell.title = `${insignia}: ${aluno.insignias[blocoId]}`;
        }
      } else {
        insigniaCell.textContent = '—';
        insigniaCell.title = 'Insígnia não conquistada';
      }
      
      row.appendChild(insigniaCell);
    });
    
    // Append row to table
    tableBody.appendChild(row);
  });
}

// Calculate bloco score for specific student
const calculateBlocoScore = (aluno, blocoId, insignias) => {
  if (!aluno.insignias || !aluno.insignias[blocoId]) return 0;
  
  // If old format (single category per block), return direct weight
  if (typeof aluno.insignias[blocoId] !== 'object') {
    const categoriaNome = aluno.insignias[blocoId].split(' ')[1] || aluno.insignias[blocoId];
    return (categoryWeights[categoriaNome] || 0) * 100;
  }
  
  // For new format, calculate average of all insignias
  let totalScore = 0;
  let count = 0;
  
  insignias.forEach(insignia => {
    const categoria = aluno.insignias[blocoId][insignia];
    
    if (categoria) {
      const categoriaNome = categoria.split(' ')[1] || categoria;
      totalScore += categoryWeights[categoriaNome] || 0;
      count++;
    }
  });
  
  // If no insignias, return 0
  if (count === 0) return 0;
  
  // Return average score (0-100)
  return Math.round((totalScore / count) * 100);
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
      if (!aluno.insignias || !aluno.insignias[currentFilters.bloco]) {
        return false;
      }
    }
    
    // Filter by insignia and categoria
    if (currentFilters.insignia !== 'all' || currentFilters.categoria !== 'all') {
      // If no insignias, exclude from results
      if (!aluno.insignias) return false;
      
      let matchesInsigniaAndCategoria = false;
      
      // Check all blocks and insignias
      Object.entries(aluno.insignias).forEach(([bloco, insignias]) => {
        // Skip if we're filtering by bloco and this is not the target bloco
        if (currentFilters.bloco !== 'all' && bloco !== currentFilters.bloco) {
          return;
        }
        
        if (typeof insignias === 'object') {
          // New format (individual categories per insignia)
          Object.entries(insignias).forEach(([insignia, categoria]) => {
            // Check insignia filter
            if (currentFilters.insignia !== 'all' && insignia !== currentFilters.insignia) {
              return;
            }
            
            // Check categoria filter
            if (currentFilters.categoria !== 'all') {
              const categoriaNome = categoria.split(' ')[1] || categoria;
              if (categoriaNome !== currentFilters.categoria) {
                return;
              }
            }
            
            matchesInsigniaAndCategoria = true;
          });
        } else {
          // Old format (single category per block)
          // Only aplicable for categoria filter
          if (currentFilters.categoria !== 'all') {
            const categoriaNome = insignias.split(' ')[1] || insignias;
            if (categoriaNome === currentFilters.categoria) {
              matchesInsigniaAndCategoria = true;
            }
          } else {
            // If only filtering by insignia, old format can't match specific insignias
            if (currentFilters.insignia === 'all') {
              matchesInsigniaAndCategoria = true;
            }
          }
        }
      });
      
      if (!matchesInsigniaAndCategoria) {
        return false;
      }
    }
    
    return true;
  });
}

// Show empty state when no data is available
const showEmptyState = () => {
  rankingLoading.style.display = 'none';
  
  rankingBody.innerHTML = `
    <tr>
      <td colspan="5">
        <div class="empty-state">
          <i class="fas fa-database"></i>
          <p>Nenhum dado de aluno disponível no momento.</p>
        </div>
      </td>
    </tr>
  `;
  
  // Also show empty state for bloco tables
  [bloco1Body, bloco2Body, bloco3Body, bloco4Body, bloco5Body].forEach(body => {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-database"></i>
            <p>Nenhum dado de aluno disponível no momento.</p>
          </div>
        </td>
      </tr>
    `;
  });
}

// Modify the applyFilters function to load grupos data
const applyFilters = () => {
  currentFilters = {
    bloco: filterBloco.value,
    insignia: filterInsignia.value,
    categoria: filterCategoria.value,
    grupo: filterGrupo.value
  };

  // Load grupos data before rendering
  loadGruposData(() => {
    renderGeneralRanking();
    renderBlocoTables();
  });
}

// Function to load grupos data
const loadGruposData = (callback) => {
  database.ref('grupos').once('value')
    .then(snapshot => {
      gruposData = snapshot.val() || {};
      populateGruposFilter();
      callback(); // Call the callback function after loading grupos data
    })
    .catch(error => {
      console.error('Error loading grupos data:', error);
      // Handle error appropriately
    });
}

// Clear all filters
const clearFilters = () => {
  // Reset form values
  filterBloco.value = 'all';
  filterInsignia.value = 'all';
  filterCategoria.value = 'all';
  filterGrupo.value = 'all';
  
  // Apply reset filters
  applyFilters();
}

// Initialize the page
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    // User is signed in
    // Load data and then apply filters
    loadData().then(() => {
      applyFilters();
    });
  } else {
    // User is signed out
    console.log('User is signed out. Please sign in.');
    // Optionally, display a message to the user
  }
});

document.addEventListener('DOMContentLoaded', () => {
  navSlide();
  initTabs();
  
  // Add filter event listeners
  btnAplicarFiltros.addEventListener('click', applyFilters);
  btnLimparFiltros.addEventListener('click', clearFilters);
});
