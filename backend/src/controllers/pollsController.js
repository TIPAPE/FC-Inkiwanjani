// backend/src/controllers/pollsController.js
const db = require('../config/database');

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, status, data, message) =>
  res.status(status).json({ success: true, message, data });

const toInt = (v) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : null; };

/**
 * GET /api/polls/active
 * Returns the currently active poll with its options (players).
 */
exports.getActivePoll = async (req, res) => {
  try {
    const [pollRows] = await db.query(
      `SELECT p.*, a.full_name as admin_name
       FROM polls p
       JOIN admin_users a ON p.adminUserID = a.adminUserID
       WHERE p.is_active = TRUE
       ORDER BY p.created_at DESC
       LIMIT 1`
    );

    if (!pollRows.length) {
      return sendError(res, 404, 'No active poll found');
    }

    const poll = pollRows[0];

    // Get players in this poll
    const [playerRows] = await db.query(
      `SELECT p.playerID, p.name, p.jersey_number, p.position
       FROM poll_votes pv
       JOIN players p ON pv.playerID = p.playerID
       WHERE pv.pollID = ?
       GROUP BY p.playerID, p.name, p.jersey_number, p.position`,
      [poll.pollID]
    );

    return sendSuccess(res, 200, {
      ...poll,
      players: playerRows,
    });
  } catch (error) {
    console.error('Get active poll error:', error);
    return sendError(res, 500, 'Failed to fetch active poll');
  }
};

/**
 * GET /api/polls/:id/results
 * Returns vote counts for each player in the poll.
 */
exports.getPollResults = async (req, res) => {
  try {
    const pollID = toInt(req.params.id);
    if (!pollID) return sendError(res, 400, 'Invalid poll id');

    const [rows] = await db.query(
      `SELECT p.playerID, p.name, p.jersey_number, p.position,
              COUNT(pv.pollVoteID) as vote_count
       FROM players p
       LEFT JOIN poll_votes pv ON p.playerID = pv.playerID AND pv.pollID = ?
       GROUP BY p.playerID, p.name, p.jersey_number, p.position
       ORDER BY vote_count DESC, p.name ASC`,
      [pollID]
    );

    return sendSuccess(res, 200, rows);
  } catch (error) {
    console.error('Get poll results error:', error);
    return sendError(res, 500, 'Failed to fetch poll results');
  }
};

/**
 * POST /api/polls/:id/vote
 * Casts a vote for a player in the poll.
 * Uses voter_ip for duplicate detection (basic protection).
 */
exports.vote = async (req, res) => {
  try {
    const pollID = toInt(req.params.id);
    const playerID = toInt(req.body?.playerID);

    if (!pollID || !playerID) {
      return sendError(res, 400, 'pollID and playerID are required');
    }

    // Verify poll exists and is active
    const [pollRows] = await db.query(
      'SELECT pollID, is_active FROM polls WHERE pollID = ? LIMIT 1',
      [pollID]
    );
    if (!pollRows.length) return sendError(res, 404, 'Poll not found');
    if (!pollRows[0].is_active) return sendError(res, 400, 'Poll is no longer active');

    // Verify player exists
    const [playerRows] = await db.query(
      'SELECT playerID, name FROM players WHERE playerID = ? AND is_active = TRUE LIMIT 1',
      [playerID]
    );
    if (!playerRows.length) return sendError(res, 404, 'Player not found');

    // Get voter IP
    const voter_ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    // Check for duplicate vote
    const [existingVotes] = await db.query(
      'SELECT pollVoteID FROM poll_votes WHERE pollID = ? AND voter_ip = ? LIMIT 1',
      [pollID, voter_ip]
    );
    if (existingVotes.length) {
      return sendError(res, 400, 'You have already voted in this poll');
    }

    // Cast vote
    await db.query(
      'INSERT INTO poll_votes (pollID, playerID, voter_ip) VALUES (?, ?, ?)',
      [pollID, playerID, voter_ip]
    );

    return sendSuccess(res, 201, null, 'Vote cast successfully');
  } catch (error) {
    console.error('Vote error:', error);
    return sendError(res, 500, 'Failed to cast vote');
  }
};

// ================== ADMIN ENDPOINTS ==================

/**
 * POST /api/admin/polls
 * Creates a new poll and adds player options.
 */
exports.createPoll = async (req, res) => {
  try {
    const adminUserID = req.user.id;
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const playerIDs = Array.isArray(req.body?.playerIDs) ? req.body.playerIDs : [];

    if (!question) return sendError(res, 400, 'Question is required');
    if (playerIDs.length < 2) return sendError(res, 400, 'At least 2 players are required');

    // Deactivate all existing polls
    await db.query('UPDATE polls SET is_active = FALSE');

    // Create new poll
    const [result] = await db.query(
      'INSERT INTO polls (adminUserID, question, is_active) VALUES (?, ?, TRUE)',
      [adminUserID, question]
    );
    const pollID = result.insertId;

    // Add player options
    const validPlayerIDs = playerIDs.map((id) => toInt(id)).filter(Boolean);
    for (const pid of validPlayerIDs) {
      await db.query(
        'INSERT INTO poll_votes (pollID, playerID) VALUES (?, ?)',
        [pollID, pid]
      );
    }

    return sendSuccess(res, 201, { pollID, question, playerIDs: validPlayerIDs }, 'Poll created');
  } catch (error) {
    console.error('Create poll error:', error);
    return sendError(res, 500, 'Failed to create poll');
  }
};

/**
 * DELETE /api/admin/polls/:id
 * Deletes a poll and all its votes.
 */
exports.deletePoll = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 400, 'Invalid poll id');

    // poll_votes has ON DELETE CASCADE, so deleting the poll removes votes
    const [result] = await db.query('DELETE FROM polls WHERE pollID = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 404, 'Poll not found');

    return sendSuccess(res, 200, null, 'Poll deleted');
  } catch (error) {
    console.error('Delete poll error:', error);
    return sendError(res, 500, 'Failed to delete poll');
  }
};

/**
 * PUT /api/admin/polls/:id/deactivate
 * Deactivates a poll (stops accepting votes).
 */
exports.deactivatePoll = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 400, 'Invalid poll id');

    const [result] = await db.query(
      'UPDATE polls SET is_active = FALSE WHERE pollID = ?',
      [id]
    );
    if (result.affectedRows === 0) return sendError(res, 404, 'Poll not found');

    return sendSuccess(res, 200, null, 'Poll deactivated');
  } catch (error) {
    console.error('Deactivate poll error:', error);
    return sendError(res, 500, 'Failed to deactivate poll');
  }
};

/**
 * GET /api/admin/polls
 * Returns all polls with their vote counts.
 */
exports.getAllPolls = async (req, res) => {
  try {
    const [pollRows] = await db.query(
      `SELECT p.*, a.full_name as admin_name
       FROM polls p
       JOIN admin_users a ON p.adminUserID = a.adminUserID
       ORDER BY p.created_at DESC`
    );

    const polls = await Promise.all(
      pollRows.map(async (poll) => {
        const [votes] = await db.query(
          `SELECT p.playerID, p.name, p.jersey_number, p.position,
                  COUNT(pv.pollVoteID) as vote_count
           FROM players p
           LEFT JOIN poll_votes pv ON p.playerID = pv.playerID AND pv.pollID = ?
           GROUP BY p.playerID, p.name, p.jersey_number, p.position
           ORDER BY vote_count DESC`,
          [poll.pollID]
        );
        return { ...poll, players: votes };
      })
    );

    return sendSuccess(res, 200, polls);
  } catch (error) {
    console.error('Get all polls error:', error);
    return sendError(res, 500, 'Failed to fetch polls');
  }
};
