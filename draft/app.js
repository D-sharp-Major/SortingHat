// In-memory state
let teams = [];
let participants = [];
let editingTeamIndex = null;
let editingParticipantIndex = null;

// DOM elements
const teamForm = document.getElementById('team-form');
const teamNameInput = document.getElementById('team-name');
const teamList = document.getElementById('team-list');
const teamError = document.getElementById('team-error');

const participantForm = document.getElementById('participant-form');
const participantNameInput = document.getElementById('participant-name');
const participantList = document.getElementById('participant-list');
const participantError = document.getElementById('participant-error');

const startDraftBtn = document.getElementById('start-draft');
const setupValidationError = document.getElementById('setup-validation-error');

// Phase elements
const setupPhase = document.getElementById('setup-phase');
const draftPhase = document.getElementById('draft-phase');
const resultsPhase = document.getElementById('results-phase');

// Utility functions
function renderTeams() {
  teamList.innerHTML = '';
  teams.forEach((team, idx) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '0.5rem';
    li.style.marginBottom = '0.25rem';
    li.innerHTML = `
      <span>${team}</span>
      <button data-edit="${idx}" style="background:var(--primary-blue);color:#fff;border:none;padding:0.2rem 0.7rem;border-radius:0.4rem;font-size:0.9rem;">Edit</button>
      <button data-delete="${idx}" style="background:var(--accent);color:#fff;border:none;padding:0.2rem 0.7rem;border-radius:0.4rem;font-size:0.9rem;">Delete</button>
    `;
    teamList.appendChild(li);
  });
}

function renderParticipants() {
  participantList.innerHTML = '';
  participants.forEach((person, idx) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '0.5rem';
    li.style.marginBottom = '0.25rem';
    li.innerHTML = `
      <span>${person}</span>
      <button data-edit="${idx}" style="background:var(--primary-purple);color:#fff;border:none;padding:0.2rem 0.7rem;border-radius:0.4rem;font-size:0.9rem;">Edit</button>
      <button data-delete="${idx}" style="background:var(--accent);color:#fff;border:none;padding:0.2rem 0.7rem;border-radius:0.4rem;font-size:0.9rem;">Delete</button>
    `;
    participantList.appendChild(li);
  });
}

// Team form logic
teamForm.onsubmit = function(e) {
  e.preventDefault();
  const name = teamNameInput.value.trim();
  if (!name) {
    teamError.textContent = 'Team name required.';
    return;
  }
  if (editingTeamIndex !== null) {
    teams[editingTeamIndex] = name;
    editingTeamIndex = null;
    teamForm.querySelector('button[type="submit"]').textContent = 'Add Team';
  } else {
    if (teams.includes(name)) {
      teamError.textContent = 'Team name must be unique.';
      return;
    }
    teams.push(name);
  }
  teamNameInput.value = '';
  teamError.textContent = '';
  renderTeams();
};

teamList.onclick = function(e) {
  if (e.target.dataset.edit !== undefined) {
    editingTeamIndex = Number(e.target.dataset.edit);
    teamNameInput.value = teams[editingTeamIndex];
    teamForm.querySelector('button[type="submit"]').textContent = 'Save';
  } else if (e.target.dataset.delete !== undefined) {
    const idx = Number(e.target.dataset.delete);
    teams.splice(idx, 1);
    if (editingTeamIndex === idx) {
      editingTeamIndex = null;
      teamNameInput.value = '';
      teamForm.querySelector('button[type="submit"]').textContent = 'Add Team';
    }
    renderTeams();
  }
};

// Participant form logic
participantForm.onsubmit = function(e) {
  e.preventDefault();
  const name = participantNameInput.value.trim();
  if (!name) {
    participantError.textContent = 'Participant name required.';
    return;
  }
  if (editingParticipantIndex !== null) {
    participants[editingParticipantIndex] = name;
    editingParticipantIndex = null;
    participantForm.querySelector('button[type="submit"]').textContent = 'Add Participant';
  } else {
    if (participants.includes(name)) {
      participantError.textContent = 'Participant name must be unique.';
      return;
    }
    participants.push(name);
  }
  participantNameInput.value = '';
  participantError.textContent = '';
  renderParticipants();
};

participantList.onclick = function(e) {
  if (e.target.dataset.edit !== undefined) {
    editingParticipantIndex = Number(e.target.dataset.edit);
    participantNameInput.value = participants[editingParticipantIndex];
    participantForm.querySelector('button[type="submit"]').textContent = 'Save';
  } else if (e.target.dataset.delete !== undefined) {
    const idx = Number(e.target.dataset.delete);
    participants.splice(idx, 1);
    if (editingParticipantIndex === idx) {
      editingParticipantIndex = null;
      participantNameInput.value = '';
      participantForm.querySelector('button[type="submit"]').textContent = 'Add Participant';
    }
    renderParticipants();
  }
};

// Draft logic variables
let draftTeams = [];
let draftParticipants = [];
let draftAssignments = [];
let draftOrder = [];
let currentRound = 0;
let currentTeamIdx = 0;
let totalRounds = 0;

// Draft phase elements
const draftBoard = document.getElementById('draft-board');
const draftProgress = document.getElementById('draft-progress');
const nextPickBtn = document.getElementById('next-pick');
const draftError = document.getElementById('draft-error');

function shuffle(array) {
  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function startDraft() {
  // Copy state
  draftTeams = teams.map(name => ({ name, members: [] }));
  draftParticipants = [...participants];
  draftAssignments = [];
  draftOrder = [];
  currentRound = 1;
  currentTeamIdx = 0;
  draftError.textContent = '';

  // Calculate fair distribution
  const numTeams = draftTeams.length;
  const numParticipants = draftParticipants.length;
  const baseSize = Math.floor(numParticipants / numTeams);
  const remainder = numParticipants % numTeams;
  totalRounds = baseSize + (remainder > 0 ? 1 : 0);

  // Build team pick order for each round
  for (let r = 0; r < totalRounds; r++) {
    for (let t = 0; t < numTeams; t++) {
      // Only allow teams to pick if they haven't reached their max
      const maxForThisTeam = baseSize + (t < remainder ? 1 : 0);
      if (draftTeams[t].members.length < maxForThisTeam) {
        draftOrder.push(t);
      }
    }
  }
  shuffle(draftParticipants);
  renderDraftBoard();
  renderDraftProgress();
  nextPickBtn.disabled = false;
}

function renderDraftBoard() {
  draftBoard.innerHTML = '';
  draftTeams.forEach(team => {
    const div = document.createElement('div');
    div.style.marginBottom = '1rem';
    div.style.background = 'linear-gradient(90deg, var(--primary-blue) 60%, var(--primary-purple) 100%)';
    div.style.color = '#fff';
    div.style.borderRadius = '0.7rem';
    div.style.padding = '0.7rem 1rem';
    div.innerHTML = `<strong>${team.name}</strong>: ${team.members.join(', ')}`;
    draftBoard.appendChild(div);
  });
}

function renderDraftProgress() {
  const picksMade = draftTeams.reduce((sum, t) => sum + t.members.length, 0);
  const totalPicks = draftParticipants.length + picksMade;
  const teamName = draftTeams[draftOrder[0]] ? draftTeams[draftOrder[0]].name : '';
  draftProgress.textContent = picksMade < totalPicks
    ? `Round ${currentRound} – ${teamName}'s pick (${picksMade + 1} of ${totalPicks})`
    : 'Draft complete!';
}

function doNextPick() {
  if (draftParticipants.length === 0 || draftOrder.length === 0) {
    nextPickBtn.disabled = true;
    draftProgress.textContent = 'Draft complete!';
    setTimeout(showResults, 1000);
    return;
  }
  // Pick for current team
  const teamIdx = draftOrder.shift();
  // Randomly select a participant
  const pickIdx = Math.floor(Math.random() * draftParticipants.length);
  const pick = draftParticipants.splice(pickIdx, 1)[0];
  draftTeams[teamIdx].members.push(pick);
  renderDraftBoard();
  renderDraftProgress();
  // Advance round if all teams picked
  if (draftOrder.length % draftTeams.length === 0) {
    currentRound++;
  }
  if (draftParticipants.length === 0 || draftOrder.length === 0) {
    nextPickBtn.disabled = true;
    draftProgress.textContent = 'Draft complete!';
    setTimeout(showResults, 1000);
  }
}

function showResults() {
  draftPhase.classList.add('hidden');
  resultsPhase.classList.remove('hidden');
  renderResults();
}

// Next Pick button
nextPickBtn.onclick = function() {
  draftError.textContent = '';
  doNextPick();
};

// Start Draft button logic (validation, phase transition, and draft start)
startDraftBtn.onclick = function() {
  setupValidationError.textContent = '';
  if (teams.length < 2) {
    setupValidationError.textContent = 'At least 2 teams are required.';
    return;
  }
  if (participants.length < 2) {
    setupValidationError.textContent = 'At least 2 participants are required.';
    return;
  }
  // Hide setup, show draft
  setupPhase.classList.add('hidden');
  draftPhase.classList.remove('hidden');
  startDraft();
};

// Results phase logic

const resultsBoard = document.getElementById('results-board');
const restartBtn = document.getElementById('restart-btn');
const reshuffleBtn = document.getElementById('reshuffle-btn');

function renderResults() {
  resultsBoard.innerHTML = '';
  draftTeams.forEach(team => {
    const div = document.createElement('div');
    div.style.marginBottom = '1rem';
    div.style.background = 'linear-gradient(90deg, var(--primary-purple) 60%, var(--primary-blue) 100%)';
    div.style.color = '#fff';
    div.style.borderRadius = '0.7rem';
    div.style.padding = '0.7rem 1rem';
    div.innerHTML = `<strong>${team.name}</strong>: ${team.members.join(', ')}`;
    resultsBoard.appendChild(div);
  });
}


reshuffleBtn.onclick = function() {
  // Go back to draft phase and reshuffle using the same teams and participants
  resultsPhase.classList.add('hidden');
  draftPhase.classList.remove('hidden');
  startDraft();
};

restartBtn.onclick = function() {
  // Reset all state and return to setup
  draftPhase.classList.add('hidden');
  resultsPhase.classList.add('hidden');
  setupPhase.classList.remove('hidden');
  teams = [];
  participants = [];
  editingTeamIndex = null;
  editingParticipantIndex = null;
  teamNameInput.value = '';
  participantNameInput.value = '';
  teamForm.querySelector('button[type="submit"]').textContent = 'Add Team';
  participantForm.querySelector('button[type="submit"]').textContent = 'Add Participant';
  teamError.textContent = '';
  participantError.textContent = '';
  setupValidationError.textContent = '';
  renderTeams();
  renderParticipants();
};

// Initial render
renderTeams();
renderParticipants();
