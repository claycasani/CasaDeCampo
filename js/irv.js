/**
 * Instant Runoff Voting (Ranked Choice) Algorithm
 * Pure function — no side effects.
 */

function getTopChoice(rankings, activeCandidates) {
  let best = null;
  let bestRank = Infinity;
  for (const candidate of activeCandidates) {
    if (rankings[candidate] !== undefined && rankings[candidate] < bestRank) {
      bestRank = rankings[candidate];
      best = candidate;
    }
  }
  return best;
}

export function calculateIRV(ballots, candidateIds) {
  if (!ballots || ballots.length === 0) {
    return { rounds: [], winner: null, totalBallots: 0 };
  }

  const rounds = [];
  let activeCandidates = [...candidateIds];

  while (activeCandidates.length > 1) {
    // Count first-choice votes among active candidates
    const voteCounts = {};
    activeCandidates.forEach(c => voteCounts[c] = 0);

    ballots.forEach(ballot => {
      const topChoice = getTopChoice(ballot.rankings, activeCandidates);
      if (topChoice) {
        voteCounts[topChoice]++;
      }
    });

    // Check for a winner (> 50%)
    const totalVotes = ballots.length;
    const majority = Math.floor(totalVotes / 2) + 1;
    const maxVotes = Math.max(...Object.values(voteCounts));
    const leader = Object.keys(voteCounts).find(c => voteCounts[c] === maxVotes);

    if (maxVotes >= majority) {
      rounds.push({
        roundNumber: rounds.length + 1,
        voteCounts: { ...voteCounts },
        eliminated: null,
        winner: leader
      });
      return { rounds, winner: leader, totalBallots: totalVotes };
    }

    // Find candidate(s) with fewest votes
    const minVotes = Math.min(...Object.values(voteCounts));
    const losers = Object.keys(voteCounts).filter(c => voteCounts[c] === minVotes);

    // If all remaining candidates are tied
    if (losers.length === activeCandidates.length) {
      rounds.push({
        roundNumber: rounds.length + 1,
        voteCounts: { ...voteCounts },
        eliminated: null,
        winner: null,
        tie: true
      });
      return { rounds, winner: null, totalBallots: totalVotes, tie: true };
    }

    // Eliminate the loser(s)
    const eliminated = losers.length === 1 ? losers : losers;
    rounds.push({
      roundNumber: rounds.length + 1,
      voteCounts: { ...voteCounts },
      eliminated: [...eliminated],
      winner: null
    });

    activeCandidates = activeCandidates.filter(c => !eliminated.includes(c));
  }

  // Only one candidate left — they win
  const winner = activeCandidates[0];
  const finalCounts = {};
  activeCandidates.forEach(c => finalCounts[c] = 0);
  ballots.forEach(ballot => {
    const topChoice = getTopChoice(ballot.rankings, activeCandidates);
    if (topChoice) finalCounts[topChoice]++;
  });

  rounds.push({
    roundNumber: rounds.length + 1,
    voteCounts: finalCounts,
    eliminated: null,
    winner: winner
  });

  return { rounds, winner, totalBallots: ballots.length };
}
