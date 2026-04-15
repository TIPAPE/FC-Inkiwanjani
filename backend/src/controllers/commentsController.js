// backend/src/controllers/commentsController.js
const db = require('../config/database');

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, status, data, message) =>
  res.status(status).json({ success: true, message, data });

const toInt = (v) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);

// Get all approved comments
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM comments
       WHERE is_approved = TRUE
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return sendSuccess(res, 200, rows);
  } catch (error) {
    console.error('Get comments error:', error);
    return sendError(res, 500, 'Failed to fetch comments');
  }
};

// Create comment
exports.create = async (req, res) => {
  try {
    const userID = req.user?.id || null;
    const commenter_name = safeTrim(req.body?.commenter_name);
    const comment_text = safeTrim(req.body?.comment_text);

    if (!commenter_name || !comment_text) {
      return sendError(res, 400, 'commenter_name and comment_text are required');
    }
    if (commenter_name.length < 1 || commenter_name.length > 100) {
      return sendError(res, 400, 'Name must be between 1 and 100 characters');
    }
    if (comment_text.length < 1 || comment_text.length > 2000) {
      return sendError(res, 400, 'Comment must be between 1 and 2000 characters');
    }

    // Link to authenticated user if applicable
    let finalUserID = userID;
    let finalName = commenter_name;

    if (userID) {
      // Verify user exists
      const [userRows] = await db.query(
        'SELECT userID, full_name FROM users WHERE userID = ? AND is_active = TRUE LIMIT 1',
        [userID]
      );
      if (userRows.length) {
        finalUserID = userID;
        finalName = userRows[0].full_name || commenter_name;
      }
    }

    const [result] = await db.query(
      `INSERT INTO comments (userID, commenter_name, comment_text, is_approved)
       VALUES (?, ?, ?, TRUE)`,
      [finalUserID, finalName, comment_text]
    );

    return sendSuccess(res, 201, {
      commentID: result.insertId,
      userID: finalUserID,
      commenter_name: finalName,
      comment_text,
      is_approved: true,
      created_at: new Date().toISOString(),
    }, 'Comment posted successfully');
  } catch (error) {
    console.error('Create comment error:', error);
    return sendError(res, 500, 'Failed to post comment');
  }
};

// Delete comment (admin)
exports.deleteComment = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 400, 'Invalid comment id');

    const [result] = await db.query('DELETE FROM comments WHERE commentID = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 404, 'Comment not found');

    return sendSuccess(res, 200, null, 'Comment deleted successfully');
  } catch (error) {
    console.error('Delete comment error:', error);
    return sendError(res, 500, 'Failed to delete comment');
  }
};

// Toggle comment approval
exports.toggleApproval = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return sendError(res, 400, 'Invalid comment id');

    const [result] = await db.query(
      'UPDATE comments SET is_approved = NOT is_approved WHERE commentID = ?',
      [id]
    );
    if (result.affectedRows === 0) return sendError(res, 404, 'Comment not found');

    return sendSuccess(res, 200, null, 'Comment approval toggled');
  } catch (error) {
    console.error('Toggle comment approval error:', error);
    return sendError(res, 500, 'Failed to toggle comment approval');
  }
};

// Get all comments (admin)
exports.getAllAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM comments ORDER BY created_at DESC LIMIT 200`
    );
    return sendSuccess(res, 200, rows);
  } catch (error) {
    console.error('Get all comments error:', error);
    return sendError(res, 500, 'Failed to fetch comments');
  }
};
