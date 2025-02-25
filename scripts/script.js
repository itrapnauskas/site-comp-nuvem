import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDH9hUEuMlsbPyq5rO5zldBnNQOX26bbG4",
  authDomain: "comp-nuvem-2025.firebaseapp.com",
  databaseURL: "https://comp-nuvem-2025-default-rtdb.firebaseio.com",
  projectId: "comp-nuvem-2025",
  storageBucket: "comp-nuvem-2025.firebasestorage.app",
  messagingSenderId: "60212118707",
  appId: "1:60212118707:web:714faf88ddfd3b536c9cc6"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Função para renderizar o ranking
function renderRanking(alunos) {
  const rankingDiv = document.getElementById('ranking');
  rankingDiv.innerHTML = '';

  alunos.forEach((aluno, index) => {
    const item = document.createElement('div');
    item.classList.add('ranking-item');
    item.innerHTML = `
      <h2>#${index + 1} - ${aluno.nome} (Score: ${aluno.score})</h2>
      <div class="insignias">
        ${aluno.insignias ? Object.keys(aluno.insignias)
          .map(bloco => `<span><strong>${bloco}:</strong> ${aluno.insignias[bloco]}</span>`)
          .join(' | ') : ''}
      </div>
    `;
    rankingDiv.appendChild(item);
  });
}

// Busca os dados do caminho 'alunos' no Realtime Database
const alunosRef = ref(database, 'alunos');
onValue(alunosRef, (snapshot) => {
  const data = snapshot.val();
  if (data) {
    // Transforma os dados em um array e ordena pelo score (do maior para o menor)
    const alunosArray = Object.values(data).sort((a, b) => b.score - a.score);
    renderRanking(alunosArray);
  }
});
