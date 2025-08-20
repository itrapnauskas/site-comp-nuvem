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
  const auth = firebase.auth();
  
  // DOM Elements
  const studentsListDiv = document.getElementById('students-list');
  const loadingStudentsDiv = document.getElementById('loading-students');
  const jsonImportData = document.getElementById('json-import-data');
  const btnImportStudents = document.getElementById('btn-import-students');
  const btnClearStudents = document.getElementById('btn-clear-students');
  const loginContainer = document.getElementById('login-container');
  const appContainer = document.getElementById('app');
  const loginErrorDiv = document.getElementById('login-error');
  const btnGoogle = document.getElementById('btn-google');
  const btnLogout = document.getElementById('btn-logout');
  const adminUserEmailSpan = document.getElementById('admin-user-email');
  
  // App State
  let studentsData = {};
  
  // Auth Allowlist - substitua pelo(s) seu(s) e-mail(s)
  const AUTHORIZED_EMAILS = [
    'igor.trapnauskas@edu.sc.senai.br'
  ];
  
  // Constants
  const INSIGNIAS = {
    "Bloco1": ["Explorador da Nuvem", "Arquiteto Cloud Iniciante", "Gestor de Custos Cloud", "Segurança Inicial em Cloud"],
    "Bloco2": ["Guardião dos Dados", "Administrador de Bancos Cloud", "Integrador de APIs e Dados"],
    "Bloco3": ["Desenvolvedor Serverless", "Protetor de APIs", "Automatizador Cloud"],
    "Bloco4": ["Monitoramento e Análise de Logs", "Otimizador de Performance", "Arquiteto de Soluções Resilientes"]
  };
  
  const CATEGORIAS = [
    "🚫 Sem Insígnia",
    "🟫 Cobre",
    "🥉 Bronze",
    "🥈 Prata",
    "🥇 Ouro",
    "💎 Diamante"
  ];
  
  // --- Auth + Gatekeeping ---
  const normalize = (s) => (s || '').toLowerCase().trim();
  const isAuthorized = (user) => user && user.email && AUTHORIZED_EMAILS.map(normalize).includes(normalize(user.email));

  const showApp = (user) => {
    if (loginContainer) loginContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    if (adminUserEmailSpan) adminUserEmailSpan.textContent = user?.email || '';
    if (loginErrorDiv) loginErrorDiv.style.display = 'none';
  };

  const showLogin = (message = '') => {
    if (appContainer) appContainer.style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'flex';
    if (loginErrorDiv) {
      if (message) {
        loginErrorDiv.textContent = message;
        loginErrorDiv.style.display = 'block';
      } else {
        loginErrorDiv.style.display = 'none';
      }
    }
  };

  const requireAuthorized = () => {
    const user = auth.currentUser;
    if (!isAuthorized(user)) {
      alert('Acesso negado. Faça login com uma conta autorizada.');
      throw new Error('Unauthorized');
    }
  };
  
  // --- Core Functions ---
  
  const loadStudents = () => {
    loadingStudentsDiv.style.display = 'block';
    studentsListDiv.innerHTML = '';
  
    database.ref('alunos/alunos').on('value', (snapshot) => {
      studentsData = snapshot.val() || {};
      renderStudents();
      loadingStudentsDiv.style.display = 'none';
    }, (error) => {
      console.error("Erro ao carregar alunos:", error);
      loadingStudentsDiv.innerHTML = 'Erro ao carregar dados. Verifique o console.';
    });
  };
  
  const renderStudents = () => {
    studentsListDiv.innerHTML = '';
    if (Object.keys(studentsData).length === 0) {
      studentsListDiv.innerHTML = '<p>Nenhum aluno encontrado.</p>';
      return;
    }
  
    // Sort students by name
    const sortedStudentIds = Object.keys(studentsData).sort((a, b) => {
      const nameA = studentsData[a].nome.toLowerCase();
      const nameB = studentsData[b].nome.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  
    for (const studentId of sortedStudentIds) {
      const student = studentsData[studentId];
      const studentCard = document.createElement('div');
      studentCard.className = 'student-card';
      studentCard.innerHTML = `
        <div class="student-header">
          <h3>${student.nome}</h3>
          <div class="student-info">
            <span>${student.email}</span> | <span>Grupo: ${student.grupo}</span>
          </div>
        </div>
        <div class="insignias-grid">
          ${Object.keys(INSIGNIAS).map(bloco => `
            <div class="insignia-group">
              <h4>${bloco.replace('Bloco', 'Bloco ')}</h4>
              ${INSIGNIAS[bloco].map(insigniaName => `
                <div class="insignia-item">
                  <label for="${studentId}-${insigniaName}">${insigniaName}</label>
                  <select id="${studentId}-${insigniaName}" data-student-id="${studentId}" data-bloco="${bloco}" data-insignia-name="${insigniaName}">
                    ${CATEGORIAS.map(cat => {
                      const studentInsigniaValue = student.insignias?.[bloco]?.[insigniaName] || '🚫 Sem Insígnia';
                      const isSelected = studentInsigniaValue.includes(cat.split(' ')[1]) || (studentInsigniaValue === '🚫 Sem Insígnia' && cat === '🚫 Sem Insígnia');
                      return `<option value="${cat}" ${isSelected ? 'selected' : ''}>${cat}</option>`;
                    }).join('')}
                  </select>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `;
      studentsListDiv.appendChild(studentCard);
    }
    addSelectListeners();
  };
  
  const addSelectListeners = () => {
    document.querySelectorAll('.insignia-item select').forEach(select => {
      select.addEventListener('change', (e) => {
        const { studentId, bloco, insigniaName } = e.target.dataset;
        const newCategory = e.target.value;
        updateInsignia(studentId, bloco, insigniaName, newCategory);
      });
    });
  };
  
  const updateInsignia = (studentId, bloco, insigniaName, newCategory) => {
    requireAuthorized();
    const dbRef = database.ref(`alunos/alunos/${studentId}/insignias/${bloco}/${insigniaName}`);
    dbRef.set(newCategory)
      .then(() => console.log(`Insignia ${insigniaName} para ${studentId} atualizada para ${newCategory}`))
      .catch(error => console.error("Erro ao atualizar insignia:", error));
  };
  
  
  // --- Data Management Functions ---
  
  const importStudents = () => {
    try {
      requireAuthorized();
      const newStudents = JSON.parse(jsonImportData.value);
      if (!Array.isArray(newStudents)) {
        alert('Erro: O JSON deve ser um array de alunos.');
        return;
      }
  
      const updates = {};
      newStudents.forEach((student, index) => {
        if (!student.nome || !student.email || !student.grupo) {
          throw new Error(`Aluno no índice ${index} não tem nome, email ou grupo.`);
        }
        const newId = `aluno${Date.now()}${index}`; // Simple unique ID
        updates[`/alunos/alunos/${newId}`] = {
          nome: student.nome,
          email: student.email,
          grupo: student.grupo,
          insignias: {
            Bloco1: { pendente: true },
            Bloco2: { pendente: true },
            Bloco3: { pendente: true },
            Bloco4: { pendente: true }
          }
        };
      });
  
      database.ref().update(updates)
        .then(() => {
          alert(`${newStudents.length} alunos importados com sucesso!`);
          jsonImportData.value = '';
        })
        .catch(error => {
          console.error("Erro ao importar alunos:", error);
          alert('Ocorreu um erro ao importar os alunos. Verifique o console.');
        });
  
    } catch (error) {
      alert(`Erro ao processar o JSON: ${error.message}`);
      console.error(error);
    }
  };
  
  const clearAllStudents = () => {
    requireAuthorized();
    const confirmation = prompt("Esta ação é irreversível e irá apagar TODOS os alunos. Para confirmar, digite 'EXCLUIR TUDO' em maiúsculas.");
    if (confirmation === 'EXCLUIR TUDO') {
      database.ref('alunos/alunos').remove()
        .then(() => {
          alert('Todos os alunos foram excluídos com sucesso.');
        })
        .catch(error => {
          console.error("Erro ao excluir alunos:", error);
          alert('Ocorreu um erro ao excluir os alunos.');
        });
    } else {
      alert('Ação cancelada.');
    }
  };
  
  
  // --- Auth Events & Observer ---
  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      auth.signInWithPopup(provider).catch(err => {
        console.error('Erro ao autenticar:', err);
        showLogin('Falha no login: ' + err.message);
      });
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => auth.signOut());
  }

  auth.onAuthStateChanged((user) => {
    if (user && isAuthorized(user)) {
      showApp(user);
      // Carrega dados e listeners somente após autorização
      loadStudents();
      if (btnImportStudents) btnImportStudents.addEventListener('click', importStudents);
      if (btnClearStudents) btnClearStudents.addEventListener('click', clearAllStudents);
    } else if (user && !isAuthorized(user)) {
      showLogin('Conta não autorizada.');
      auth.signOut();
    } else {
      showLogin();
    }
  });