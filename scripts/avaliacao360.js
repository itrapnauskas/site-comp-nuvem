// Import da configuração do Firebase
import { firebaseConfig } from '../config/database.js';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const evaluationList = document.getElementById('evaluation-list');
const evaluationFormSection = document.getElementById('evaluation-form-section');
const evaluationForm = document.getElementById('evaluation-form');
const formProjectTitle = document.getElementById('form-project-title');
const formGroupName = document.getElementById('form-group-name');
const peerEvaluationsContainer = document.getElementById('peer-evaluations');
const cancelButton = document.querySelector('.btn-cancel');

// O restante do código permanece igual

// Current User (simulated - in a real app this would come from authentication)
let currentUser = {
  id: 'temp-user-id', // This will be replaced when the user identifies themselves
  name: '',
  group: ''
};

// Current active evaluation
let currentEvaluation = null;

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

// Accordion Functionality
const initAccordion = () => {
  const accordionButtons = document.querySelectorAll('.accordion-button');
  
  accordionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const content = button.nextElementSibling;
      const icon = button.querySelector('.accordion-icon');
      
      if (content.style.display === 'block') {
        content.style.display = 'none';
        icon.textContent = '+';
      } else {
        content.style.display = 'block';
        icon.textContent = '-';
      }
    });
  });
}

// Format date for display
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Calculate remaining days
const getRemainingDays = (endDate) => {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Check if evaluation is completed by user
const isEvaluationCompleted = (evaluation, userId) => {
  if (evaluation.responses && evaluation.responses[userId]) {
    return true;
  }
  return false;
}

// Check if evaluation is expired
const isEvaluationExpired = (evaluation) => {
  const now = new Date();
  const endDate = new Date(evaluation.dataFim);
  return now > endDate;
}

// Load available evaluations from Firebase
const loadEvaluations = () => {
  evaluationList.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Carregando avaliações disponíveis...</p>
    </div>
  `;
  
  // First, identify the user
  identifyUser()
    .then(() => {
      // Then load evaluations for the user's group
      return database.ref('avaliacoes360').once('value');
    })
    .then((snapshot) => {
      const evaluations = snapshot.val();
      evaluationList.innerHTML = '';
      
      if (!evaluations) {
        evaluationList.innerHTML = `
          <div class="no-evaluations">
            <p>Não há avaliações disponíveis no momento.</p>
          </div>
        `;
        return;
      }
      
      // Filter evaluations for user's group
      const userEvaluations = Object.entries(evaluations)
        .filter(([id, evaluation]) => {
          // If evaluation has groups property, check if user's group is included
          if (evaluation.groups) {
            return evaluation.groups.includes(currentUser.group);
          }
          // If no groups property, assume evaluation is for all users
          return true;
        })
        .map(([id, evaluation]) => ({
          id,
          ...evaluation
        }));
      
      if (userEvaluations.length === 0) {
        evaluationList.innerHTML = `
          <div class="no-evaluations">
            <p>Não há avaliações disponíveis para o seu grupo no momento.</p>
          </div>
        `;
        return;
      }
      
      // Sort evaluations by status (open first) and then by date
      userEvaluations.sort((a, b) => {
        const aCompleted = isEvaluationCompleted(a, currentUser.id);
        const bCompleted = isEvaluationCompleted(b, currentUser.id);
        const aExpired = isEvaluationExpired(a);
        const bExpired = isEvaluationExpired(b);
        
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;
        if (aExpired && !bExpired) return 1;
        if (!aExpired && bExpired) return -1;
        
        return new Date(b.dataInicio) - new Date(a.dataInicio);
      });
      
      // Render evaluations
      userEvaluations.forEach(evaluation => {
        const isCompleted = isEvaluationCompleted(evaluation, currentUser.id);
        const isExpired = isEvaluationExpired(evaluation);
        let statusClass, statusText;
        
        if (isCompleted) {
          statusClass = 'status-completed';
          statusText = 'Concluída';
        } else if (isExpired) {
          statusClass = 'status-expired';
          statusText = 'Expirada';
        } else {
          statusClass = 'status-open';
          statusText = 'Aberta';
        }
        
        const remainingDays = getRemainingDays(evaluation.dataFim);
        let remainingText = '';
        
        if (!isCompleted && !isExpired) {
          remainingText = remainingDays > 0 
            ? `Restam ${remainingDays} dia(s)` 
            : 'Expira hoje';
        }
        
        const evaluationCard = document.createElement('div');
        evaluationCard.className = 'evaluation-card';
        evaluationCard.innerHTML = `
          <div class="evaluation-info">
            <h3>${evaluation.titulo || `Avaliação 360° - ${evaluation.projetoId}`}</h3>
            <div class="evaluation-meta">
              <p>Início: ${formatDate(evaluation.dataInicio)} | Término: ${formatDate(evaluation.dataFim)}</p>
              <p>${remainingText}</p>
            </div>
          </div>
          <div class="evaluation-status-container">
            <span class="evaluation-status ${statusClass}">${statusText}</span>
          </div>
          <div class="evaluation-action">
            <button 
              class="btn-evaluate" 
              data-evaluation-id="${evaluation.id}"
              ${isCompleted || isExpired ? 'disabled' : ''}
            >
              ${isCompleted ? 'Concluída' : 'Avaliar'}
            </button>
          </div>
        `;
        
        // Add event listener only if evaluation is open
        if (!isCompleted && !isExpired) {
          const button = evaluationCard.querySelector('.btn-evaluate');
          button.addEventListener('click', () => {
            openEvaluationForm(evaluation);
          });
        }
        
        evaluationList.appendChild(evaluationCard);
      });
    })
    .catch(error => {
      console.error('Error loading evaluations:', error);
      evaluationList.innerHTML = `
        <div class="error-message">
          <p>Erro ao carregar avaliações. Por favor, tente novamente mais tarde.</p>
          <p>Detalhes: ${error.message}</p>
        </div>
      `;
    });
}

// Identify the user (simulated - in a real app this would use authentication)
const identifyUser = () => {
  return new Promise((resolve, reject) => {
    // For demonstration purposes, we'll look up the user by email
    // In a real app, this would use authentication
    
    // Check if we already have user info in localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      resolve();
      return;
    }
    
    // If not, prompt the user for identification
    const userEmail = prompt('Por favor, informe seu e-mail para acessar as avaliações:');
    if (!userEmail) {
      reject(new Error('É necessário informar um e-mail para acessar as avaliações.'));
      return;
    }
    
    // Look up the user in the database
    database.ref('alunos').orderByChild('email').equalTo(userEmail).once('value')
      .then(snapshot => {
        const userData = snapshot.val();
        
        if (!userData) {
          throw new Error('E-mail não encontrado no sistema. Por favor, verifique e tente novamente.');
        }
        
        // Get the first user with this email
        const userId = Object.keys(userData)[0];
        const user = userData[userId];
        
        currentUser = {
          id: userId,
          name: user.nome,
          group: user.grupo,
          email: user.email
        };
        
        // Store in localStorage for future use
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        resolve();
      })
      .catch(error => {
        reject(error);
      });
  });
}

// Open evaluation form
const openEvaluationForm = (evaluation) => {
  currentEvaluation = evaluation;
  
  // Set form title and group
  formProjectTitle.textContent = `Projeto: ${evaluation.projetoId}`;
  formGroupName.textContent = `Grupo: ${currentUser.group}`;
  
  // Clear previous peer evaluations
  peerEvaluationsContainer.innerHTML = '';
  
  // Load group members for peer evaluation
  loadGroupMembers()
    .then(members => {
      // Generate peer evaluation sections for each group member (except current user)
      members.forEach(member => {
        if (member.id !== currentUser.id) {
          const peerSection = document.createElement('div');
          peerSection.className = 'peer-evaluation';
          peerSection.dataset.peerId = member.id;
          peerSection.innerHTML = `
            <h5>Colega: ${member.nome}</h5>
            
            <div class="form-group">
              <label>Colaboração:</label>
              <div class="rating-container">
                <div class="rating">
                  <input type="radio" id="peer-${member.id}-collaboration-5" name="peer-${member.id}-collaboration" value="5">
                  <label for="peer-${member.id}-collaboration-5">5</label>
                  <input type="radio" id="peer-${member.id}-collaboration-4" name="peer-${member.id}-collaboration" value="4">
                  <label for="peer-${member.id}-collaboration-4">4</label>
                  <input type="radio" id="peer-${member.id}-collaboration-3" name="peer-${member.id}-collaboration" value="3">
                  <label for="peer-${member.id}-collaboration-3">3</label>
                  <input type="radio" id="peer-${member.id}-collaboration-2" name="peer-${member.id}-collaboration" value="2">
                  <label for="peer-${member.id}-collaboration-2">2</label>
                  <input type="radio" id="peer-${member.id}-collaboration-1" name="peer-${member.id}-collaboration" value="1">
                  <label for="peer-${member.id}-collaboration-1">1</label>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>Engajamento:</label>
              <div class="rating-container">
                <div class="rating">
                  <input type="radio" id="peer-${member.id}-engagement-5" name="peer-${member.id}-engagement" value="5">
                  <label for="peer-${member.id}-engagement-5">5</label>
                  <input type="radio" id="peer-${member.id}-engagement-4" name="peer-${member.id}-engagement" value="4">
                  <label for="peer-${member.id}-engagement-4">4</label>
                  <input type="radio" id="peer-${member.id}-engagement-3" name="peer-${member.id}-engagement" value="3">
                  <label for="peer-${member.id}-engagement-3">3</label>
                  <input type="radio" id="peer-${member.id}-engagement-2" name="peer-${member.id}-engagement" value="2">
                  <label for="peer-${member.id}-engagement-2">2</label>
                  <input type="radio" id="peer-${member.id}-engagement-1" name="peer-${member.id}-engagement" value="1">
                  <label for="peer-${member.id}-engagement-1">1</label>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>Responsabilidade:</label>
              <div class="rating-container">
                <div class="rating">
                  <input type="radio" id="peer-${member.id}-responsibility-5" name="peer-${member.id}-responsibility" value="5">
                  <label for="peer-${member.id}-responsibility-5">5</label>
                  <input type="radio" id="peer-${member.id}-responsibility-4" name="peer-${member.id}-responsibility" value="4">
                  <label for="peer-${member.id}-responsibility-4">4</label>
                  <input type="radio" id="peer-${member.id}-responsibility-3" name="peer-${member.id}-responsibility" value="3">
                  <label for="peer-${member.id}-responsibility-3">3</label>
                  <input type="radio" id="peer-${member.id}-responsibility-2" name="peer-${member.id}-responsibility" value="2">
                  <label for="peer-${member.id}-responsibility-2">2</label>
                  <input type="radio" id="peer-${member.id}-responsibility-1" name="peer-${member.id}-responsibility" value="1">
                  <label for="peer-${member.id}-responsibility-1">1</label>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>Qualidade Técnica:</label>
              <div class="rating-container">
                <div class="rating">
                  <input type="radio" id="peer-${member.id}-technical-5" name="peer-${member.id}-technical" value="5">
                  <label for="peer-${member.id}-technical-5">5</label>
                  <input type="radio" id="peer-${member.id}-technical-4" name="peer-${member.id}-technical" value="4">
                  <label for="peer-${member.id}-technical-4">4</label>
                  <input type="radio" id="peer-${member.id}-technical-3" name="peer-${member.id}-technical" value="3">
                  <label for="peer-${member.id}-technical-3">3</label>
                  <input type="radio" id="peer-${member.id}-technical-2" name="peer-${member.id}-technical" value="2">
                  <label for="peer-${member.id}-technical-2">2</label>
                  <input type="radio" id="peer-${member.id}-technical-1" name="peer-${member.id}-technical" value="1">
                  <label for="peer-${member.id}-technical-1">1</label>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>Comentários sobre este colega:</label>
              <textarea name="peer-${member.id}-comments" rows="2" placeholder="Descreva os pontos fortes e áreas de melhoria..."></textarea>
            </div>
          `;
          
          peerEvaluationsContainer.appendChild(peerSection);
        }
      });
      
      // Show form
      evaluationFormSection.style.display = 'block';
      window.scrollTo({ top: evaluationFormSection.offsetTop - 20, behavior: 'smooth' });
    })
    .catch(error => {
      console.error('Error loading group members:', error);
      alert(`Erro ao carregar membros do grupo: ${error.message}`);
    });
}

// Load group members
const loadGroupMembers = () => {
  return new Promise((resolve, reject) => {
    if (!currentUser.group) {
      reject(new Error('Usuário não está associado a um grupo.'));
      return;
    }
    
    database.ref('alunos').orderByChild('grupo').equalTo(currentUser.group).once('value')
      .then(snapshot => {
        const members = [];
        snapshot.forEach(childSnapshot => {
          members.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        
        resolve(members);
      })
      .catch(error => {
        reject(error);
      });
  });
}

// Submit evaluation form
const submitEvaluation = (event) => {
  event.preventDefault();
  
  if (!currentEvaluation || !currentUser.id) {
    alert('Erro: Dados de avaliação ou usuário não encontrados.');
    return;
  }
  
  // Validate form
  if (!validateForm()) {
    return;
  }
  
  // Collect form data
  const formData = {
    userId: currentUser.id,
    userName: currentUser.name,
    timestamp: Date.now(),
    selfEvaluation: {
      collaboration: document.querySelector('input[name="self-collaboration"]:checked').value,
      engagement: document.querySelector('input[name="self-engagement"]:checked').value,
      responsibility: document.querySelector('input[name="self-responsibility"]:checked').value,
      technical: document.querySelector('input[name="self-technical"]:checked').value,
      comments: document.getElementById('self-comments').value.trim()
    },
    peerEvaluations: {}
  };
  
  // Collect peer evaluations
  const peerSections = document.querySelectorAll('.peer-evaluation');
  peerSections.forEach(section => {
    const peerId = section.dataset.peerId;
    
    formData.peerEvaluations[peerId] = {
      collaboration: document.querySelector(`input[name="peer-${peerId}-collaboration"]:checked`).value,
      engagement: document.querySelector(`input[name="peer-${peerId}-engagement"]:checked`).value,
      responsibility: document.querySelector(`input[name="peer-${peerId}-responsibility"]:checked`).value,
      technical: document.querySelector(`input[name="peer-${peerId}-technical"]:checked`).value,
      comments: document.querySelector(`textarea[name="peer-${peerId}-comments"]`).value.trim()
    };
  });
  
  // Show loading indicator
  document.querySelector('.form-actions').innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Enviando avaliação...</p>
    </div>
  `;
  
  // Save to Firebase
  database.ref(`avaliacoes360/${currentEvaluation.id}/responses/${currentUser.id}`).set(formData)
    .then(() => {
      // Show success message
      evaluationFormSection.innerHTML = `
        <div class="success-message">
          <h2><i class="fas fa-check-circle"></i> Avaliação enviada com sucesso!</h2>
          <p>Sua avaliação foi registrada. Obrigado pela participação.</p>
          <button class="btn-return" onclick="returnToList()">Voltar para a lista</button>
        </div>
      `;
      
      // Reload evaluations list to update status
      loadEvaluations();
    })
    .catch(error => {
      console.error('Error submitting evaluation:', error);
      document.querySelector('.form-actions').innerHTML = `
        <div class="error-message">
          <p>Erro ao enviar avaliação: ${error.message}</p>
          <button class="btn-submit">Tentar Novamente</button>
          <button class="btn-cancel">Cancelar</button>
        </div>
      `;
      
      // Re-attach event listeners
      document.querySelector('.btn-submit').addEventListener('click', submitEvaluation);
      document.querySelector('.btn-cancel').addEventListener('click', closeForm);
    });
}

// Validate form before submission
const validateForm = () => {
  let isValid = true;
  const errorMessages = [];
  
  // Check self-evaluation
  ['collaboration', 'engagement', 'responsibility', 'technical'].forEach(criteria => {
    const radioButtons = document.getElementsByName(`self-${criteria}`);
    let checked = false;
    
    radioButtons.forEach(button => {
      if (button.checked) {
        checked = true;
      }
    });
    
    if (!checked) {
      isValid = false;
      errorMessages.push(`Por favor, avalie sua própria ${getPortugueseCriteria(criteria)}.`);
      
      // Highlight the field
      const container = document.querySelector(`input[name="self-${criteria}"]`).closest('.form-group');
      container.classList.add('error');
    }
  });
  
  // Check peer evaluations
  const peerSections = document.querySelectorAll('.peer-evaluation');
  peerSections.forEach(section => {
    const peerId = section.dataset.peerId;
    const peerName = section.querySelector('h5').textContent.replace('Colega: ', '');
    
    ['collaboration', 'engagement', 'responsibility', 'technical'].forEach(criteria => {
      const radioButtons = document.getElementsByName(`peer-${peerId}-${criteria}`);
      let checked = false;
      
      radioButtons.forEach(button => {
        if (button.checked) {
          checked = true;
        }
      });
      
      if (!checked) {
        isValid = false;
        errorMessages.push(`Por favor, avalie a ${getPortugueseCriteria(criteria)} de ${peerName}.`);
        
        // Highlight the field
        const container = document.querySelector(`input[name="peer-${peerId}-${criteria}"]`).closest('.form-group');
        container.classList.add('error');
      }
    });
  });
  
  // Display error messages if any
  if (!isValid) {
    // Remove previous error message if exists
    const previousError = document.querySelector('.form-error-message');
    if (previousError) {
      previousError.remove();
    }
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'message error-message form-error-message';
    errorElement.innerHTML = `
      <h4>Por favor, corrija os seguintes erros:</h4>
      <ul>
        ${errorMessages.map(msg => `<li>${msg}</li>`).join('')}
      </ul>
    `;
    
    // Insert at the top of the form
    evaluationForm.insertBefore(errorElement, evaluationForm.firstChild);
    
    // Scroll to error message
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  return isValid;
}

// Convert criteria to Portuguese
const getPortugueseCriteria = (criteria) => {
  const translations = {
    'collaboration': 'Colaboração',
    'engagement': 'Engajamento',
    'responsibility': 'Responsabilidade',
    'technical': 'Qualidade Técnica'
  };
  
  return translations[criteria] || criteria;
}

// Close form and return to list
const closeForm = () => {
  evaluationFormSection.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Return to list after submission
const returnToList = () => {
  evaluationFormSection.style.display = 'none';
  evaluationFormSection.innerHTML = `
    <h2>Formulário de Avaliação</h2>
    <div class="form-container">
      <form id="evaluation-form">
        <div class="form-header">
          <h3 id="form-project-title">Projeto: [Nome do Projeto]</h3>
          <p id="form-group-name">Grupo: [Nome do Grupo]</p>
        </div>
        
        <div class="form-section">
          <h4>1. Autoavaliação</h4>
          <!-- Self-evaluation fields -->
        </div>
        
        <div class="form-section" id="peer-evaluation-container">
          <h4>2. Avaliação dos Colegas</h4>
          <p class="peer-note">As avaliações são anônimas. Avalie cada colega de grupo com honestidade e construtivamente.</p>
          <div id="peer-evaluations"></div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn-submit">Enviar Avaliação</button>
          <button type="button" class="btn-cancel">Cancelar</button>
        </div>
      </form>
    </div>
  `;
  
  // Update DOM references after rebuilding the form
  evaluationForm = document.getElementById('evaluation-form');
  formProjectTitle = document.getElementById('form-project-title');
  formGroupName = document.getElementById('form-group-name');
  peerEvaluationsContainer = document.getElementById('peer-evaluations');
  cancelButton = document.querySelector('.btn-cancel');
  
  // Re-attach event listeners
  evaluationForm.addEventListener('submit', submitEvaluation);
  cancelButton.addEventListener('click', closeForm);
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Logout function
const logout = () => {
  localStorage.removeItem('currentUser');
  currentUser = {
    id: 'temp-user-id',
    name: '',
    group: ''
  };
  loadEvaluations();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  navSlide();
  initAccordion();
  
  // Load evaluations
  loadEvaluations();
  
  // Form submission
  evaluationForm.addEventListener('submit', submitEvaluation);
  
  // Cancel button
  cancelButton.addEventListener('click', closeForm);
  
  // Clear form field error on input
  document.addEventListener('change', event => {
    if (event.target.matches('input[type="radio"]')) {
      const container = event.target.closest('.form-group');
      if (container) {
        container.classList.remove('error');
      }
    }
  });
});

// Add global function for returning to list
window.returnToList = returnToList;
window.logout = logout;
