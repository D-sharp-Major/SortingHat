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

const minTeamSizeInput = document.getElementById('min-team-size');
const maxTeamSizeInput = document.getElementById('max-team-size');

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

function startDraft(minTeamSize, maxTeamSize) {
  // Copy state
  draftTeams = teams.map(name => ({ name, members: [] }));
  draftParticipants = [...participants];
  draftAssignments = [];
  draftOrder = [];
  currentRound = 1;
  currentTeamIdx = 0;
  draftError.textContent = '';

  // Calculate fair distribution with constraints
  const numTeams = draftTeams.length;
  const numParticipants = draftParticipants.length;
  // Calculate max for each team
  let teamMaxes = Array(numTeams).fill(minTeamSize);
  let left = numParticipants - minTeamSize * numTeams;
  let t = 0;
  while (left > 0) {
    if (teamMaxes[t] < maxTeamSize) {
      teamMaxes[t]++;
      left--;
    }
    t = (t + 1) % numTeams;
  }
  // Build team pick order for each round
  let teamPicks = teamMaxes.map(max => max);
  let picksLeft = numParticipants;
  while (picksLeft > 0) {
    for (let i = 0; i < numTeams; i++) {
      if (teamPicks[i] > 0 && picksLeft > 0) {
        draftOrder.push(i);
        teamPicks[i]--;
        picksLeft--;
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
  const minTeamSize = parseInt(minTeamSizeInput.value, 10);
  const maxTeamSize = parseInt(maxTeamSizeInput.value, 10);
  if (teams.length < 2) {
    setupValidationError.textContent = 'At least 2 teams are required.';
    return;
  }
  if (participants.length < 2) {
    setupValidationError.textContent = 'At least 2 participants are required.';
    return;
  }
  if (minTeamSize < 1 || maxTeamSize < 1) {
    setupValidationError.textContent = 'Team sizes must be at least 1.';
    return;
  }
  if (minTeamSize > maxTeamSize) {
    setupValidationError.textContent = 'Min team size cannot be greater than max team size.';
    return;
  }
  const minPossible = Math.floor(participants.length / teams.length);
  const maxPossible = Math.ceil(participants.length / teams.length);
  if (minTeamSize > maxPossible) {
    setupValidationError.textContent = `Too few participants for min team size (${minTeamSize}).`;
    return;
  }
  if (maxTeamSize < minPossible) {
    setupValidationError.textContent = `Too many participants for max team size (${maxTeamSize}).`;
    return;
  }
  // Hide setup, show draft
  setupPhase.classList.add('hidden');
  draftPhase.classList.remove('hidden');
  startDraft(minTeamSize, maxTeamSize);
};

function startDraft(minTeamSize, maxTeamSize) {
  // Copy state
  draftTeams = teams.map(name => ({ name, members: [] }));
  draftParticipants = [...participants];
  draftAssignments = [];
  draftOrder = [];
  currentRound = 1;
  currentTeamIdx = 0;
  draftError.textContent = '';

  // Calculate fair distribution with constraints
  const numTeams = draftTeams.length;
  const numParticipants = draftParticipants.length;
  // Calculate max for each team
  let teamMaxes = Array(numTeams).fill(minTeamSize);
  let left = numParticipants - minTeamSize * numTeams;
  let t = 0;
  while (left > 0) {
    if (teamMaxes[t] < maxTeamSize) {
      teamMaxes[t]++;
      left--;
    }
    t = (t + 1) % numTeams;
  }
  // Build team pick order for each round
  let teamPicks = teamMaxes.map(max => max);
  let picksLeft = numParticipants;
  while (picksLeft > 0) {
    for (let i = 0; i < numTeams; i++) {
      if (teamPicks[i] > 0 && picksLeft > 0) {
        draftOrder.push(i);
        teamPicks[i]--;
        picksLeft--;
      }
    }
  }
  shuffle(draftParticipants);
  renderDraftBoard();
  renderDraftProgress();
  nextPickBtn.disabled = false;
}

// Results phase button handlers

reshuffleBtn.addEventListener('click', function(e) {
  e.preventDefault();
  resultsPhase.classList.add('hidden');
  draftPhase.classList.remove('hidden');
  startDraft();
});

exportTeamsBtn.addEventListener('click', function(e) {
  e.preventDefault();
  let text = 'Team Assignments\n\n';
  draftTeams.forEach(team => {
    text += team.name + ':\n';
    if (team.members.length > 0) {
      text += team.members.map(m => '  - ' + m).join('\n') + '\n';
    } else {
      text += '  (No members)\n';
    }
    text += '\n';
  });
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teams.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
});

confirmTeamsBtn.addEventListener('click', function(e) {
  e.preventDefault();
  resultsPhase.classList.add('hidden');
  teamRandomizerPhase.classList.remove('hidden');
  // Copy teams for randomizer
  randomizerTeams = draftTeams.map(team => ({ ...team }));
  lastRandomizedIdx = null;
  renderRandomizerBoard();
  randomizerResult.textContent = '';
});

restartBtn.addEventListener('click', function(e) {
  e.preventDefault();
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
});

exportTeamsBtn.onclick = function() {
  let text = 'Team Assignments\n\n';
  draftTeams.forEach(team => {
    text += team.name + ':\n';
    if (team.members.length > 0) {
      text += team.members.map(m => '  - ' + m).join('\n') + '\n';
    } else {
      text += '  (No members)\n';
    }
    text += '\n';
  });
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teams.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

confirmTeamsBtn.onclick = function() {
  resultsPhase.classList.add('hidden');
  teamRandomizerPhase.classList.remove('hidden');
  // Copy teams for randomizer
  randomizerTeams = draftTeams.map(team => ({ ...team }));
  lastRandomizedIdx = null;
  renderRandomizerBoard();
  randomizerResult.textContent = '';
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

// Results phase logic

const resultsBoard = document.getElementById('results-board');
const restartBtn = document.getElementById('restart-btn');
const reshuffleBtn = document.getElementById('reshuffle-btn');
const confirmTeamsBtn = document.getElementById('confirm-teams-btn');
const exportTeamsBtn = document.getElementById('export-teams-btn');
// Export Teams button logic
exportTeamsBtn.onclick = function() {
  let text = 'Team Assignments\n\n';
  draftTeams.forEach(team => {
    text += team.name + ':\n';
    if (team.members.length > 0) {
      text += team.members.map(m => '  - ' + m).join('\n') + '\n';
    } else {
      text += '  (No members)\n';
    }
    text += '\n';
  });
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teams.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

// Team Randomizer phase elements
const teamRandomizerPhase = document.getElementById('team-randomizer-phase');
const randomizerBoard = document.getElementById('randomizer-board');
const randomizeTeamBtn = document.getElementById('randomize-team-btn');
const randomizerResult = document.getElementById('randomizer-result');
const randomizerBackBtn = document.getElementById('randomizer-back-btn');
// Team Randomizer state
let randomizerTeams = [];
let lastRandomizedIdx = null;
// Confirm Teams button logic
confirmTeamsBtn.onclick = function() {
  resultsPhase.classList.add('hidden');
  teamRandomizerPhase.classList.remove('hidden');
  // Copy teams for randomizer
  randomizerTeams = draftTeams.map(team => ({ ...team }));
  lastRandomizedIdx = null;
  renderRandomizerBoard();
  randomizerResult.textContent = '';
};

function renderRandomizerBoard() {
  randomizerBoard.innerHTML = '';
  randomizerTeams.forEach((team, idx) => {
    const div = document.createElement('div');
    div.style.marginBottom = '1rem';
    div.style.background = (lastRandomizedIdx === idx)
      ? 'linear-gradient(90deg, var(--accent) 60%, var(--primary-purple) 100%)'
      : 'linear-gradient(90deg, var(--primary-blue) 60%, var(--primary-purple) 100%)';
    div.style.color = '#fff';
    div.style.borderRadius = '0.7rem';
    div.style.padding = '0.7rem 1rem';
    div.innerHTML = `<strong>${team.name}</strong>: ${team.members.join(', ')}`;
    randomizerBoard.appendChild(div);
  });
}

randomizeTeamBtn.onclick = function() {
  if (randomizerTeams.length === 0) return;
  const idx = Math.floor(Math.random() * randomizerTeams.length);
  lastRandomizedIdx = idx;
  renderRandomizerBoard();
  randomizerResult.textContent = `Next up: ${randomizerTeams[idx].name}`;
};

randomizerBackBtn.onclick = function() {
  teamRandomizerPhase.classList.add('hidden');
  resultsPhase.classList.remove('hidden');
};

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
