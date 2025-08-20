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
  const btnSaveChanges = document.getElementById('btn-save-changes');
  const bulkNamesInput = document.getElementById('bulk-names-input');
  const bulkGroupSelect = document.getElementById('bulk-group-select');
  const btnAddBulkNames = document.getElementById('btn-add-bulk-names');
  const newGroupNameInput = document.getElementById('new-group-name');
  const btnAddGroup = document.getElementById('btn-add-group');
  const groupsListDiv = document.getElementById('groups-list');
  
  // App State
  let studentsData = {};
  let groupsData = {};
  let pendingEdits = {}; // { [studentId]: { nome?, email?, grupo? } }
  
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
  
    database.ref('alunos').on('value', (snapshot) => {
      const data = snapshot.val() || {};
      // Normaliza caso os dados estejam em '/alunos/alunos'
      studentsData = data.alunos || data;
      renderStudents();
      loadingStudentsDiv.style.display = 'none';
    }, (error) => {
      console.error("Erro ao carregar alunos:", error);
      loadingStudentsDiv.innerHTML = 'Erro ao carregar dados. Verifique o console.';
    });
  };

  const loadGroups = () => {
    database.ref('grupos').on('value', (snapshot) => {
      groupsData = snapshot.val() || {};
      refreshGroupSelect();
      renderGroupsList();
      renderStudents();
    }, (error) => {
      console.error('Erro ao carregar grupos:', error);
    });
  };
  
  const renderStudents = () => {
    studentsListDiv.innerHTML = '';
    const hasStudents = Object.keys(studentsData).length > 0;
    if (!hasStudents) {
      studentsListDiv.innerHTML = '<p>Nenhum aluno encontrado.</p>';
      return;
    }

    const groupNames = Array.from(new Set([
      ...Object.keys(groupsData || {}),
      ...Object.values(studentsData || {}).map(s => s.grupo).filter(g => !!g)
    ])).sort((a, b) => a.localeCompare(b));

    // Render groups that exist
    groupNames.forEach(groupName => {
      renderGroupSection(groupName);
    });

    // Render students without group under a special section
    const ungroupedIds = Object.keys(studentsData).filter(id => !studentsData[id].grupo);
    if (ungroupedIds.length > 0) {
      renderGroupSection('', ungroupedIds);
    }

    addSelectListeners();
    addInlineEditListeners();
  };

  const renderGroupSection = (groupName, explicitIds = null) => {
    const groupLabel = groupName || 'Sem Grupo';
    const groupSection = document.createElement('section');
    groupSection.className = 'group-section';

    // Group-level notas (4 trabalhos)
    const notas = groupsData?.[groupName]?.notas || {};
    const n1 = notas?.trabalho1 ?? '';
    const n2 = notas?.trabalho2 ?? '';
    const n3 = notas?.trabalho3 ?? '';
    const n4 = notas?.trabalho4 ?? '';

    groupSection.innerHTML = `
      <div class="group-header" style="display:flex; align-items:center; justify-content: space-between; margin: 1rem 0;">
        <h3 style="margin:0;">Grupo: ${groupLabel}</h3>
        ${groupName ? `
        <div class="group-controls" data-group="${groupName}" style="display:flex; gap: 0.5rem; align-items:center;">
          <label>Trabalho 1: <input type="number" min="0" max="10" step="0.1" id="nota-${cssSafe(groupName)}-1" value="${n1}"></label>
          <label>Trabalho 2: <input type="number" min="0" max="10" step="0.1" id="nota-${cssSafe(groupName)}-2" value="${n2}"></label>
          <label>Trabalho 3: <input type="number" min="0" max="10" step="0.1" id="nota-${cssSafe(groupName)}-3" value="${n3}"></label>
          <label>Trabalho 4: <input type="number" min="0" max="10" step="0.1" id="nota-${cssSafe(groupName)}-4" value="${n4}"></label>
          <button class="btn-secondary" data-action="save-notas" data-group="${groupName}"><i class="fas fa-save"></i> Salvar Notas</button>
        </div>` : ''}
      </div>
      <div class="group-students"></div>
    `;

    const container = groupSection.querySelector('.group-students');
    const studentIds = explicitIds || getStudentsForGroup(groupName);
    const sortedIds = studentIds.sort((a, b) => {
      const nameA = (studentsData[a]?.nome || '').toLowerCase();
      const nameB = (studentsData[b]?.nome || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    sortedIds.forEach(studentId => {
      const student = studentsData[studentId];
      if (!student) return;
      const studentCard = document.createElement('div');
      studentCard.className = 'student-card';
      const currentGroup = student.grupo || '';
      const groupOptions = getGroupOptionsHtml(currentGroup);
      studentCard.innerHTML = `
        <div class="student-header">
          <h3 class="editable" data-field="nome" data-student-id="${studentId}" contenteditable="false">${escapeHtml(student.nome || '')}</h3>
          <div class="student-info">
            <span class="editable" data-field="email" data-student-id="${studentId}" contenteditable="false">${escapeHtml(student.email || '')}</span>
            | <label>Grupo: <select class="group-select" data-student-id="${studentId}">${groupOptions}</select></label>
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
      // Set initial group select
      const sel = studentCard.querySelector('select.group-select');
      if (sel) sel.value = currentGroup;

      container.appendChild(studentCard);
    });

    // Attach group notas save handler
    const groupSaveBtn = groupSection.querySelector('[data-action="save-notas"][data-group]');
    if (groupSaveBtn) {
      groupSaveBtn.addEventListener('click', () => {
        const g = groupSaveBtn.dataset.group;
        saveGroupNotas(g);
      });
    }

    studentsListDiv.appendChild(groupSection);
  };

  const getGroupOptionsHtml = (currentGroup) => {
    const names = Array.from(new Set([
      '',
      ...Object.keys(groupsData || {})
    ]));
    return names.map(name => `<option value="${name}">${name || 'Sem Grupo'}</option>`).join('');
  };

  const cssSafe = (str) => String(str).replace(/[^a-zA-Z0-9_-]+/g, '-');
  const escapeHtml = (s) => (s || '').replace(/[&<>\"]+/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const sanitizeFirebaseKey = (name) => String(name).replace(/[.#$\[\]\/]/g, '-');
  const getStudentsForGroup = (groupName) => {
    const set = new Set(groupsData?.[groupName]?.alunos || []);
    Object.entries(studentsData || {}).forEach(([id, s]) => {
      if ((s.grupo || '') === (groupName || '')) set.add(id);
    });
    return Array.from(set);
  };

  const refreshGroupSelect = () => {
    if (!bulkGroupSelect) return;
    const names = Object.keys(groupsData || {});
    const current = bulkGroupSelect.value;
    bulkGroupSelect.innerHTML = '<option value="">Sem Grupo</option>' +
      names.sort((a,b)=>a.localeCompare(b)).map(g => `<option value="${g}">${g}</option>`).join('');
    if (current && names.includes(current)) bulkGroupSelect.value = current;
  };

  const renderGroupsList = () => {
    if (!groupsListDiv) return;
    const names = Object.keys(groupsData || {}).sort((a,b)=>a.localeCompare(b));
    if (names.length === 0) {
      groupsListDiv.innerHTML = '<p>Nenhum grupo cadastrado.</p>';
      return;
    }
    groupsListDiv.innerHTML = names.map(name => {
      const count = Array.isArray(groupsData?.[name]?.alunos) ? groupsData[name].alunos.length : getStudentsForGroup(name).length;
      return `
        <div class="group-row" data-group="${name}" style="display:flex; align-items:center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
          <div>
            <strong>${name}</strong>
            <span style="color:#666; margin-left: .5rem;">${count} aluno(s)</span>
          </div>
          <button class="btn btn-danger btn-sm" data-action="delete-group" data-group="${name}"><i class="fas fa-trash"></i> Excluir</button>
        </div>`;
    }).join('');
  };

  const addInlineEditListeners = () => {
    document.querySelectorAll('.editable[data-student-id][data-field]').forEach(el => {
      el.addEventListener('dblclick', () => {
        el.setAttribute('contenteditable', 'true');
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      const commit = () => {
        el.setAttribute('contenteditable', 'false');
        const value = el.textContent.trim();
        const sid = el.dataset.studentId;
        const field = el.dataset.field; // 'nome' | 'email'
        markStudentEdit(sid, field, value);
      };
      el.addEventListener('blur', commit);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); el.textContent = studentsData[el.dataset.studentId]?.[el.dataset.field] || ''; el.blur(); }
      });
    });

    document.querySelectorAll('select.group-select[data-student-id]').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const sid = e.target.dataset.studentId;
        const newGroup = e.target.value || '';
        markStudentEdit(sid, 'grupo', newGroup);
      });
    });
  };

  const markStudentEdit = (studentId, field, value) => {
    if (!pendingEdits[studentId]) pendingEdits[studentId] = {};
    pendingEdits[studentId][field] = value;
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
    const dbRef = database.ref(`alunos/${studentId}/insignias/${bloco}/${insigniaName}`);
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
        updates[`/alunos/${newId}`] = {
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
      database.ref('alunos').remove()
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

  const addBulkStudents = () => {
    try {
      requireAuthorized();
      const namesRaw = (bulkNamesInput?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (namesRaw.length === 0) { alert('Informe ao menos um nome.'); return; }
      const assignGroup = bulkGroupSelect?.value || '';
      const updates = {};
      const newIds = [];
      namesRaw.forEach((name, idx) => {
        const newId = `aluno${Date.now()}${idx}`;
        newIds.push(newId);
        updates[`/alunos/${newId}`] = {
          nome: name,
          email: '',
          grupo: assignGroup,
          insignias: { Bloco1: { pendente: true }, Bloco2: { pendente: true }, Bloco3: { pendente: true }, Bloco4: { pendente: true } }
        };
      });
      if (assignGroup) {
        const current = Array.isArray(groupsData?.[assignGroup]?.alunos) ? [...groupsData[assignGroup].alunos] : [];
        updates[`/grupos/${assignGroup}/alunos`] = [...new Set([...current, ...newIds])];
      }
      database.ref().update(updates).then(() => {
        alert(`${namesRaw.length} alunos adicionados.`);
        if (bulkNamesInput) bulkNamesInput.value = '';
      }).catch(err => {
        console.error('Erro ao adicionar alunos:', err);
        alert('Erro ao adicionar alunos.');
      });
    } catch (e) {
      alert(`Erro: ${e.message}`);
    }
  };

  const addGroup = () => {
    try {
      requireAuthorized();
      const raw = (newGroupNameInput?.value || '').trim();
      const name = sanitizeFirebaseKey(raw);
      if (!name) { alert('Informe um nome de grupo válido.'); return; }
      if (groupsData && groupsData[name]) { alert('Grupo já existe.'); return; }
      database.ref(`grupos/${name}`).set({ alunos: [] }).then(() => {
        alert('Grupo adicionado.');
        if (newGroupNameInput) newGroupNameInput.value = '';
      }).catch(err => {
        console.error('Erro ao adicionar grupo:', err);
        alert('Erro ao adicionar grupo.');
      });
    } catch (e) {
      alert(`Erro: ${e.message}`);
    }
  };

  const deleteGroup = (groupName) => {
    try {
      requireAuthorized();
      if (!groupName) return;
      const ok = confirm(`Excluir grupo "${groupName}"? Alunos ficarão sem grupo.`);
      if (!ok) return;
      const updates = {};
      updates[`/grupos/${groupName}`] = null;
      // Limpa o campo grupo dos alunos pertencentes a este grupo
      const affected = new Set([...(groupsData?.[groupName]?.alunos || [])]);
      Object.entries(studentsData || {}).forEach(([sid, s]) => { if ((s.grupo||'') === groupName) affected.add(sid); });
      affected.forEach(sid => { updates[`/alunos/${sid}/grupo`] = ''; });
      database.ref().update(updates).then(() => {
        alert('Grupo excluído.');
      }).catch(err => {
        console.error('Erro ao excluir grupo:', err);
        alert('Erro ao excluir grupo.');
      });
    } catch (e) {
      alert(`Erro: ${e.message}`);
    }
  };

  const saveGroupNotas = (groupName) => {
    try {
      requireAuthorized();
      const idSafe = cssSafe(groupName);
      const n1 = parseFloat(document.getElementById(`nota-${idSafe}-1`)?.value);
      const n2 = parseFloat(document.getElementById(`nota-${idSafe}-2`)?.value);
      const n3 = parseFloat(document.getElementById(`nota-${idSafe}-3`)?.value);
      const n4 = parseFloat(document.getElementById(`nota-${idSafe}-4`)?.value);
      const notas = {};
      if (!Number.isNaN(n1)) notas.trabalho1 = n1;
      if (!Number.isNaN(n2)) notas.trabalho2 = n2;
      if (!Number.isNaN(n3)) notas.trabalho3 = n3;
      if (!Number.isNaN(n4)) notas.trabalho4 = n4;
      database.ref(`/grupos/${groupName}/notas`).set(notas).then(()=>{
        alert('Notas do grupo salvas.');
      }).catch(err=>{
        console.error('Erro ao salvar notas do grupo:', err);
        alert('Erro ao salvar notas do grupo.');
      });
    } catch (e) {
      alert(`Erro: ${e.message}`);
    }
  };

  const applyPendingEdits = () => {
    try {
      requireAuthorized();
      const edits = pendingEdits;
      pendingEdits = {};
      const updates = {};
      // Prepare group membership adjustments
      const memberships = {};
      Object.keys(groupsData || {}).forEach(g => memberships[g] = Array.isArray(groupsData[g].alunos) ? [...groupsData[g].alunos] : []);
      const touchedGroups = new Set();

      Object.entries(edits).forEach(([sid, fields]) => {
        if (fields.nome !== undefined) updates[`/alunos/${sid}/nome`] = fields.nome;
        if (fields.email !== undefined) updates[`/alunos/${sid}/email`] = fields.email;
        if (fields.grupo !== undefined) {
          const newG = fields.grupo || '';
          const oldG = studentsData?.[sid]?.grupo || '';
          updates[`/alunos/${sid}/grupo`] = newG;
          if (oldG) {
            memberships[oldG] = (memberships[oldG] || []).filter(x => x !== sid);
            touchedGroups.add(oldG);
          }
          if (newG) {
            if (!memberships[newG]) memberships[newG] = [];
            memberships[newG] = Array.from(new Set([...(memberships[newG] || []), sid]));
            touchedGroups.add(newG);
          }
        }
      });

      touchedGroups.forEach(g => {
        updates[`/grupos/${g}/alunos`] = memberships[g] || [];
      });

      if (Object.keys(updates).length === 0) { alert('Nada para salvar.'); return; }
      database.ref().update(updates).then(()=>{
        alert('Alterações salvas.');
      }).catch(err=>{
        console.error('Erro ao salvar alterações:', err);
        alert('Erro ao salvar alterações.');
      });
    } catch (e) {
      alert(`Erro: ${e.message}`);
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
      loadGroups();
      if (btnImportStudents) btnImportStudents.addEventListener('click', importStudents);
      if (btnClearStudents) btnClearStudents.addEventListener('click', clearAllStudents);
      if (btnSaveChanges) btnSaveChanges.addEventListener('click', applyPendingEdits);
      if (btnAddBulkNames) btnAddBulkNames.addEventListener('click', addBulkStudents);
      if (btnAddGroup) btnAddGroup.addEventListener('click', addGroup);
      if (groupsListDiv) {
        groupsListDiv.addEventListener('click', (e) => {
          const btn = e.target.closest && e.target.closest('[data-action="delete-group"][data-group]');
          if (!btn) return;
          const groupName = btn.getAttribute('data-group');
          deleteGroup(groupName);
        });
      }
    } else if (user && !isAuthorized(user)) {
      showLogin('Conta não autorizada.');
      auth.signOut();
    } else {
      showLogin();
    }
  });