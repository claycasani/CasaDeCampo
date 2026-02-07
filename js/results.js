import { db, authReady, ref, onValue } from './firebase-config.js';
import { listings } from './listings-data.js';
import { calculateIRV } from './irv.js';

const TOTAL_VOTERS = 13;
const candidateIds = listings.map(l => l.id);

// Lookup helpers
function getListingById(id) {
  return listings.find(l => l.id === id);
}

function getListingLabel(id) {
  const l = getListingById(id);
  return l ? `${l.label}: ${l.name}` : id;
}

function getShortLabel(id) {
  const l = getListingById(id);
  return l ? l.label : id;
}

// DOM Elements
const loadingState = document.getElementById('loadingState');
const noVotesState = document.getElementById('noVotesState');
const resultsContent = document.getElementById('resultsContent');
const winnerBanner = document.getElementById('winnerBanner');
const roundsContainer = document.getElementById('roundsContainer');
const votesTableBody = document.getElementById('votesTableBody');
const voteCountText = document.getElementById('voteCountText');
const progressFill = document.getElementById('progressFill');

// Connect to Firebase and listen for updates
async function init() {
  try {
    await authReady;
  } catch (e) {
    console.error('Auth failed:', e);
  }

  const votesRef = ref(db, 'votes');
  onValue(votesRef, (snapshot) => {
    loadingState.style.display = 'none';
    const data = snapshot.val();

    if (!data || Object.keys(data).length === 0) {
      noVotesState.style.display = 'block';
      resultsContent.style.display = 'none';
      voteCountText.textContent = '0 of 13 votes';
      progressFill.style.width = '0%';
      return;
    }

    noVotesState.style.display = 'none';
    resultsContent.style.display = 'block';

    // Transform to ballot array
    const ballots = Object.values(data).map(vote => ({
      voter: vote.name,
      rankings: vote.rankings
    }));

    const count = ballots.length;
    voteCountText.textContent = `${count} of ${TOTAL_VOTERS} votes`;
    progressFill.style.width = `${(count / TOTAL_VOTERS) * 100}%`;

    // Run IRV
    const result = calculateIRV(ballots, candidateIds);

    renderWinner(result);
    renderRounds(result, count);
    renderVotesTable(ballots);
  });
}

function renderWinner(result) {
  if (!result.winner) {
    if (result.tie) {
      winnerBanner.innerHTML = `
        <div class="winner-banner" style="background: linear-gradient(135deg, var(--color-accent) 0%, #d35400 100%);">
          <h2>It's a Tie!</h2>
          <p>No clear winner yet. More votes may break the tie.</p>
        </div>
      `;
    } else {
      winnerBanner.innerHTML = '';
    }
    return;
  }

  const listing = getListingById(result.winner);
  winnerBanner.innerHTML = `
    <div class="winner-banner">
      <h2>We Have a Winner!</h2>
      <div class="winner-name">${listing.label}: ${listing.name}</div>
      <div class="winner-price">$${listing.priceTotal.toLocaleString()} total &middot; $${listing.pricePerPerson}/person</div>
      <a href="${listing.url}" target="_blank" rel="noopener" class="btn btn-primary" style="margin-top:8px;">
        View on Airbnb
      </a>
    </div>
  `;
}

function renderRounds(result, totalVotes) {
  roundsContainer.innerHTML = '';

  result.rounds.forEach(round => {
    const card = document.createElement('div');
    card.className = 'round-card';

    let roundTitle = `Round ${round.roundNumber}`;
    if (round.winner) roundTitle += ' — Final';

    let html = `<h3>${roundTitle}</h3>`;

    // Sort candidates by vote count descending
    const sorted = Object.entries(round.voteCounts).sort((a, b) => b[1] - a[1]);
    const maxVotes = Math.max(...Object.values(round.voteCounts));

    sorted.forEach(([candidateId, votes]) => {
      const isWinner = round.winner === candidateId;
      const isEliminated = round.eliminated && round.eliminated.includes(candidateId);
      const barWidth = maxVotes > 0 ? (votes / totalVotes) * 100 : 0;

      let barClass = 'active';
      if (isWinner) barClass = 'winner';
      if (isEliminated) barClass = 'eliminated';

      const rowClass = isEliminated ? 'round-row eliminated-row' : 'round-row';

      html += `
        <div class="${rowClass}">
          <div class="candidate-name">${getListingLabel(candidateId)}</div>
          <div class="vote-bar-container">
            <div class="vote-bar ${barClass}" style="width:${Math.max(barWidth, 8)}%;">
              ${votes} vote${votes !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      `;
    });

    if (round.eliminated && round.eliminated.length > 0) {
      const names = round.eliminated.map(id => getShortLabel(id)).join(', ');
      html += `<div class="round-eliminated-note">Eliminated: ${names}</div>`;
    }

    if (round.winner) {
      const majority = Math.floor(totalVotes / 2) + 1;
      html += `<div class="round-winner-note">${getShortLabel(round.winner)} wins with a majority! (needed ${majority} of ${totalVotes})</div>`;
    }

    card.innerHTML = html;
    roundsContainer.appendChild(card);
  });
}

function renderVotesTable(ballots) {
  votesTableBody.innerHTML = '';

  // Sort ballots alphabetically by voter name
  const sorted = [...ballots].sort((a, b) => a.voter.localeCompare(b.voter));

  sorted.forEach(ballot => {
    const row = document.createElement('tr');
    // Find which listing is ranked 1st, 2nd, 3rd, 4th
    const rankToListing = {};
    for (const [listingId, rank] of Object.entries(ballot.rankings)) {
      rankToListing[rank] = getShortLabel(listingId);
    }

    row.innerHTML = `
      <td><strong>${ballot.voter}</strong></td>
      <td>${rankToListing[1] || '-'}</td>
      <td>${rankToListing[2] || '-'}</td>
      <td>${rankToListing[3] || '-'}</td>
      <td>${rankToListing[4] || '-'}</td>
    `;
    votesTableBody.appendChild(row);
  });
}

init();
