// src/controllers/statsController.js
const { query } = require('../config/database');

/**
 * Produces a lightweight summary:
 * - played: number of completed matches
 * - points: computed from completed matches (win=3, draw=1, loss=0)
 * - played_count: number of completed matches
 * - top_scorer: name + goals (from players table)
 *
 * Note: there's no league table in schema, so 'position' isn't computed here.
 */
exports.getSummary = async (req, res) => {
  try {
    // Pull completed matches
    const matches = await query(
      `SELECT id, venue, home_score, away_score, match_date
       FROM matches
       WHERE status = 'completed'`
    );

    let played = 0;
    let points = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    matches.forEach((m) => {
      played += 1;
      // club is FC Inkiwanjani
      const clubScore = (m.venue === 'home') ? (m.home_score ?? 0) : (m.away_score ?? 0);
      const oppScore = (m.venue === 'home') ? (m.away_score ?? 0) : (m.home_score ?? 0);

      goalsFor += clubScore;
      goalsAgainst += oppScore;

      if (clubScore > oppScore) points += 3;
      else if (clubScore === oppScore) points += 1;
      // else 0 points for loss
    });

    // Top scorer
    const topScorerRows = await query(
      `SELECT name, goals FROM players WHERE is_active = TRUE ORDER BY goals DESC LIMIT 1`
    );
    const top_scorer = topScorerRows.length ? topScorerRows[0].name : null;
    const top_scorer_goals = topScorerRows.length ? topScorerRows[0].goals : 0;

    res.json({
      success: true,
      data: {
        position: null, // not available from current schema
        points,
        played,
        goals_for: goalsFor,
        goals_against: goalsAgainst,
        top_scorer,
        top_scorer_goals
      }
    });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
