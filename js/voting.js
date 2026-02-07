import { db, authReady, ref, set, get, onValue } from './firebase-config.js';
import { listings } from './listings-data.js';
import { createCarouselHTML, initCarousel } from './carousel.js';

const TOTAL_VOTERS = 13;
let currentVoterKey = null;
let currentVoterName = null;
let existingRankings = null;

// DOM Elements
const nameInput = document.getElementById('voterName');
const nameSubmitBtn = document.getElementById('nameSubmitBtn');
const nameStatus = document.getElementById('nameStatus');
const nameSection = document.getElementById('nameSection');
const votingSection = document.getElementById('votingSection');
const cardsGrid = document.getElementById('cardsGrid');
const submitVoteBtn = document.getElementById('submitVoteBtn');
const validationError = document.getElementById('validationError');
const successMessage = document.getElementById('successMessage');
const voteCount = document.getElementById('voteCount');

function normalizeKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Listen for vote count
function listenForVoteCount() {
  const votesRef = ref(db, 'votes');
  onValue(votesRef, (snapshot) => {
    const data = snapshot.val();
    const count = data ? Object.keys(data).length : 0;
    voteCount.innerHTML = `<strong>${count}</strong> of <strong>${TOTAL_VOTERS}</strong> votes submitted`;
  });
}

// Handle name submission
nameSubmitBtn.addEventListener('click', handleNameSubmit);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleNameSubmit();
});

async function handleNameSubmit() {
  const name = nameInput.value.trim();
  if (!name) {
    nameStatus.textContent = 'Please enter your name.';
    nameStatus.style.color = 'var(--color-danger)';
    return;
  }

  currentVoterName = name;
  currentVoterKey = normalizeKey(name);

  nameSubmitBtn.disabled = true;
  nameStatus.textContent = 'Checking...';
  nameStatus.style.color = 'var(--color-text-light)';

  try {
    await authReady;
    // Race the Firebase get against a timeout to avoid hanging on bad config
    const snapshot = await Promise.race([
      get(ref(db, `votes/${currentVoterKey}`)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
    if (snapshot.exists()) {
      existingRankings = snapshot.val().rankings;
      nameStatus.textContent = `Welcome back, ${name}! Your previous vote has been loaded. Update your rankings below.`;
      nameStatus.style.color = 'var(--color-primary-light)';
    } else {
      existingRankings = null;
      nameStatus.textContent = '';
    }
  } catch (err) {
    console.error('Error checking existing vote:', err);
    existingRankings = null;
    nameStatus.textContent = '';
  }

  nameSubmitBtn.disabled = false;
  renderPropertyCards();
  votingSection.style.display = 'block';
  nameSection.querySelector('h2').textContent = `Voting as: ${name}`;
  nameInput.disabled = true;
  nameSubmitBtn.textContent = 'Change';
  nameSubmitBtn.onclick = () => {
    nameInput.disabled = false;
    nameInput.focus();
    votingSection.style.display = 'none';
    nameSection.querySelector('h2').textContent = 'Enter Your Name to Vote';
    nameSubmitBtn.textContent = 'Continue';
    nameSubmitBtn.onclick = handleNameSubmit;
    successMessage.style.display = 'none';
    validationError.style.display = 'none';
  };

  listenForVoteCount();

  // Scroll to cards
  votingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render property cards
function renderPropertyCards() {
  cardsGrid.innerHTML = '';

  listings.forEach((listing) => {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.dataset.id = listing.id;

    const existingRank = existingRankings ? existingRankings[listing.id] : '';
    const priceDisplay = listing.priceOriginal
      ? `<span class="original-price">$${listing.priceOriginal.toLocaleString()}</span>$${listing.priceTotal.toLocaleString()}`
      : `$${listing.priceTotal.toLocaleString()}`;

    card.innerHTML = `
      ${createCarouselHTML(listing.images)}
      <div class="card-body">
        <span class="card-label">${listing.label}</span>
        <h3 class="card-title">${listing.name}</h3>
        ${listing.subtitle ? `<div class="card-subtitle">${listing.subtitle}</div>` : ''}
        <div class="card-price">${priceDisplay}</div>
        <div class="card-price-per">$${listing.pricePerPerson}/person for 5 nights</div>
        <div class="card-stats">
          <span>${listing.guests}+ guests</span>
          <span>${listing.bedrooms} bedrooms</span>
          <span>${listing.beds} beds</span>
          <span>${listing.baths} baths</span>
        </div>
        <div class="card-amenities">
          ${listing.amenities.map(a => `<span class="amenity-tag">${a}</span>`).join('')}
        </div>
        ${listing.host.rating ? `
        <div class="card-host">
          Hosted by ${listing.host.name} &middot; ${listing.host.yearsHosting} years &middot;
          <span class="host-rating">${listing.host.rating} &#9733;</span> (${listing.host.reviews} reviews)
        </div>
        ` : `
        <div class="card-host">
          Hosted by ${listing.host.name} &middot; ${listing.host.yearsHosting} years hosting
        </div>
        `}
        <ul class="card-highlights">
          ${listing.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
        <div class="card-actions">
          <div class="rank-selector">
            <label for="rank-${listing.id}">Your Rank:</label>
            <select id="rank-${listing.id}" data-listing-id="${listing.id}">
              <option value="">--</option>
              <option value="1" ${existingRank === 1 ? 'selected' : ''}>1st</option>
              <option value="2" ${existingRank === 2 ? 'selected' : ''}>2nd</option>
              <option value="3" ${existingRank === 3 ? 'selected' : ''}>3rd</option>
              <option value="4" ${existingRank === 4 ? 'selected' : ''}>4th</option>
            </select>
          </div>
          <a href="${listing.url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">View on Airbnb</a>
        </div>
      </div>
    `;

    cardsGrid.appendChild(card);
  });

  // Initialize carousels
  document.querySelectorAll('.carousel').forEach(initCarousel);

  // Set up rank auto-swap
  document.querySelectorAll('.rank-selector select').forEach(select => {
    select.addEventListener('change', handleRankChange);
  });
}

// Handle rank changes with auto-swap
function handleRankChange(e) {
  const changedSelect = e.target;
  const newValue = changedSelect.value;
  const changedId = changedSelect.dataset.listingId;

  if (!newValue) return;

  // Find if another select has the same value
  document.querySelectorAll('.rank-selector select').forEach(other => {
    if (other.dataset.listingId !== changedId && other.value === newValue) {
      // Swap: give the other select the value this one previously had
      // or clear it
      const previousValue = changedSelect.dataset.previousValue || '';
      other.value = previousValue;
      other.dataset.previousValue = previousValue;
    }
  });

  changedSelect.dataset.previousValue = newValue;
  validationError.style.display = 'none';
}

// Initialize previous values for auto-swap
document.addEventListener('focusin', (e) => {
  if (e.target.matches && e.target.matches('.rank-selector select')) {
    e.target.dataset.previousValue = e.target.value;
  }
});

// Submit vote
submitVoteBtn.addEventListener('click', async () => {
  // Validate
  const rankings = {};
  const values = [];
  let allFilled = true;

  listings.forEach(listing => {
    const select = document.getElementById(`rank-${listing.id}`);
    const val = select.value;
    if (!val) {
      allFilled = false;
    } else {
      rankings[listing.id] = parseInt(val);
      values.push(parseInt(val));
    }
  });

  if (!allFilled) {
    validationError.textContent = 'Please rank all 4 villas before submitting.';
    validationError.style.display = 'block';
    return;
  }

  // Check uniqueness
  const unique = new Set(values);
  if (unique.size !== 4 || ![1,2,3,4].every(v => unique.has(v))) {
    validationError.textContent = 'Each rank (1-4) must be used exactly once.';
    validationError.style.display = 'block';
    return;
  }

  validationError.style.display = 'none';
  submitVoteBtn.disabled = true;
  submitVoteBtn.textContent = 'Submitting...';

  try {
    await authReady;
    const { auth } = await import('./firebase-config.js');
    await set(ref(db, `votes/${currentVoterKey}`), {
      name: currentVoterName,
      rankings: rankings,
      timestamp: Date.now(),
      uid: auth.currentUser ? auth.currentUser.uid : 'anonymous'
    });

    successMessage.style.display = 'block';
    submitVoteBtn.textContent = 'Vote Submitted!';
    submitVoteBtn.disabled = false;

    // Allow re-submission
    setTimeout(() => {
      submitVoteBtn.textContent = 'Update Vote';
    }, 2000);
  } catch (err) {
    console.error('Failed to submit vote:', err);
    validationError.textContent = 'Failed to submit vote. Please check your connection and try again.';
    validationError.style.display = 'block';
    submitVoteBtn.disabled = false;
    submitVoteBtn.textContent = 'Submit Vote';
  }
});
