// backend/src/controllers/reportsController.js
const db = require('../config/database');

// Helpers

const buildDateCondition = (startDate, endDate, column = 'transaction_date', prefix = '') => {
  if (startDate && endDate)
    return `${prefix}${column} BETWEEN '${startDate}' AND '${endDate}'`;
  return '';
};

// Player performance report
exports.getPlayerPerformanceReport = async (req, res) => {
  try {
    const { position, minGoals, minAppearances } = req.query;

    let whereConditions = ['is_active = TRUE'];
    if (position)       whereConditions.push(`position = '${position}'`);
    if (minGoals)       whereConditions.push(`goals >= ${minGoals}`);
    if (minAppearances) whereConditions.push(`appearances >= ${minAppearances}`);
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const [players] = await db.execute(`
      SELECT
        playerID, name, jersey_number, position, age,
        goals, assists,
        (goals + assists) AS goal_contributions,
        appearances,
        yellow_cards, red_cards,
        CASE WHEN appearances > 0 THEN ROUND(goals / appearances, 2) ELSE 0 END AS goals_per_game,
        CASE WHEN appearances > 0 THEN ROUND(assists / appearances, 2) ELSE 0 END AS assists_per_game,
        date_joined
      FROM players
      ${whereClause}
      ORDER BY goals DESC, assists DESC
    `);

    const [positionStats] = await db.execute(`
      SELECT
        position,
        COUNT(*) AS player_count,
        SUM(goals) AS total_goals,
        SUM(assists) AS total_assists,
        AVG(age) AS avg_age
      FROM players
      WHERE is_active = TRUE
      GROUP BY position
    `);

    const [discipline] = await db.execute(`
      SELECT
        COUNT(*) AS total_players,
        SUM(yellow_cards) AS total_yellows,
        SUM(red_cards) AS total_reds,
        AVG(yellow_cards) AS avg_yellows,
        AVG(red_cards) AS avg_reds
      FROM players
      WHERE is_active = TRUE
    `);

    return res.status(200).json({
      success: true,
      data: { players, positionStats, discipline: discipline[0] },
    });
  } catch (error) {
    console.error('Player performance report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate player performance report' });
  }
};

// Squad overview report
exports.getSquadOverviewReport = async (req, res) => {
  try {
    const [squad] = await db.execute(`
      SELECT
        playerID, name, jersey_number, position, age,
        goals, assists, appearances, yellow_cards, red_cards, date_joined
      FROM players
      WHERE is_active = TRUE
      ORDER BY position, jersey_number
    `);

    const [summary] = await db.execute(`
      SELECT
        COUNT(*) AS total_players,
        AVG(age) AS avg_age,
        SUM(goals) AS total_goals,
        SUM(assists) AS total_assists,
        SUM(appearances) AS total_appearances,
        SUM(yellow_cards) AS total_yellows,
        SUM(red_cards) AS total_reds
      FROM players
      WHERE is_active = TRUE
    `);

    const [byPosition] = await db.execute(`
      SELECT
        position,
        COUNT(*) AS count,
        AVG(age) AS avg_age,
        SUM(goals) AS goals,
        SUM(assists) AS assists
      FROM players
      WHERE is_active = TRUE
      GROUP BY position
      ORDER BY FIELD(position, 'goalkeeper','defender','midfielder','forward')
    `);

    return res.status(200).json({
      success: true,
      data: { squad, summary: summary[0], byPosition },
    });
  } catch (error) {
    console.error('Squad overview report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate squad overview report' });
  }
};

// Top scorers report
exports.getTopScorersReport = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [topScorers] = await db.execute(`
      SELECT
        playerID, name, jersey_number, position,
        goals, assists,
        (goals + assists) AS goal_contributions,
        appearances,
        CASE WHEN appearances > 0 THEN ROUND(goals / appearances, 2) ELSE 0 END AS goals_per_game
      FROM players
      WHERE is_active = TRUE AND appearances > 0
      ORDER BY goals DESC, assists DESC
      LIMIT ${parseInt(limit)}
    `);

    const [topAssists] = await db.execute(`
      SELECT
        playerID, name, jersey_number, position,
        assists, goals, appearances,
        CASE WHEN appearances > 0 THEN ROUND(assists / appearances, 2) ELSE 0 END AS assists_per_game
      FROM players
      WHERE is_active = TRUE AND appearances > 0
      ORDER BY assists DESC, goals DESC
      LIMIT ${parseInt(limit)}
    `);

    return res.status(200).json({
      success: true,
      data: { topScorers, topAssists },
    });
  } catch (error) {
    console.error('Top scorers report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate top scorers report' });
  }
};

// Match performance report
exports.getMatchPerformanceReport = async (req, res) => {
  try {
    const { season, competition, venue } = req.query;

    let whereConditions = ["status = 'completed'"];
    if (season)      whereConditions.push(`YEAR(match_date) = ${season}`);
    if (competition) whereConditions.push(`competition = '${competition}'`);
    if (venue)       whereConditions.push(`venue = '${venue}'`);
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const [matches] = await db.execute(`
      SELECT
        matchID, opponent, match_date, venue, competition,
        home_score, away_score, attendance,
        CASE
          WHEN venue = 'home' AND home_score > away_score THEN 'win'
          WHEN venue = 'away' AND away_score > home_score THEN 'win'
          WHEN home_score = away_score THEN 'draw'
          ELSE 'loss'
        END AS result,
        CASE WHEN venue = 'home' THEN home_score ELSE away_score END AS goals_scored,
        CASE WHEN venue = 'home' THEN away_score ELSE home_score END AS goals_conceded
      FROM matches
      ${whereClause}
      ORDER BY match_date DESC
    `);

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) AS total_matches,
        SUM(CASE WHEN (venue='home' AND home_score>away_score) OR (venue='away' AND away_score>home_score) THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN home_score=away_score THEN 1 ELSE 0 END) AS draws,
        SUM(CASE WHEN (venue='home' AND home_score<away_score) OR (venue='away' AND away_score<home_score) THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN venue='home' THEN home_score ELSE away_score END) AS total_goals_scored,
        SUM(CASE WHEN venue='home' THEN away_score ELSE home_score END) AS total_goals_conceded,
        SUM(CASE WHEN (venue='home' AND away_score=0) OR (venue='away' AND home_score=0) THEN 1 ELSE 0 END) AS clean_sheets,
        AVG(attendance) AS avg_attendance
      FROM matches
      ${whereClause}
    `);

    // Home vs away breakdown
    const [venueBreakdown] = await db.execute(`
      SELECT
        venue,
        COUNT(*) AS played,
        SUM(CASE WHEN (venue='home' AND home_score>away_score) OR (venue='away' AND away_score>home_score) THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN home_score=away_score THEN 1 ELSE 0 END) AS draws,
        SUM(CASE WHEN (venue='home' AND home_score<away_score) OR (venue='away' AND away_score<home_score) THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN venue='home' THEN home_score ELSE away_score END) AS goals_for,
        SUM(CASE WHEN venue='home' THEN away_score ELSE home_score END) AS goals_against
      FROM matches
      ${whereClause}
      GROUP BY venue
    `);

    const [form] = await db.execute(`
      SELECT
        DATE(match_date) AS match_date, opponent,
        CASE
          WHEN (venue='home' AND home_score>away_score) OR (venue='away' AND away_score>home_score) THEN 'W'
          WHEN home_score=away_score THEN 'D'
          ELSE 'L'
        END AS result
      FROM matches
      ${whereClause}
      ORDER BY match_date DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      data: {
        matches,
        statistics: stats[0],
        venueBreakdown,
        recentForm: form,
      },
    });
  } catch (error) {
    console.error('Match performance report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate match performance report' });
  }
};

// Fixtures report
exports.getFixturesReport = async (req, res) => {
  try {
    const { days = 30, competition, venue } = req.query;

    let whereConditions = ["status = 'upcoming'", `match_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ${parseInt(days)} DAY)`];
    if (competition) whereConditions.push(`competition = '${competition}'`);
    if (venue)       whereConditions.push(`venue = '${venue}'`);
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const [fixtures] = await db.execute(`
      SELECT
        matchID, opponent, match_date, venue, competition,
        DATEDIFF(match_date, CURDATE()) AS days_until_match
      FROM matches
      ${whereClause}
      ORDER BY match_date ASC
    `);

    return res.status(200).json({
      success: true,
      data: { fixtures },
    });
  } catch (error) {
    console.error('Fixtures report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate fixtures report' });
  }
};

// Season performance report
exports.getSeasonPerformanceReport = async (req, res) => {
  try {
    const { season } = req.query;
    const yearFilter = season ? `AND YEAR(match_date) = ${season}` : '';

    const [overall] = await db.execute(`
      SELECT
        COUNT(*) AS total_matches,
        SUM(CASE WHEN (venue='home' AND home_score>away_score) OR (venue='away' AND away_score>home_score) THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN home_score=away_score THEN 1 ELSE 0 END) AS draws,
        SUM(CASE WHEN (venue='home' AND home_score<away_score) OR (venue='away' AND away_score<home_score) THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN venue='home' THEN home_score ELSE away_score END) AS goals_scored,
        SUM(CASE WHEN venue='home' THEN away_score ELSE home_score END) AS goals_conceded,
        (SUM(CASE WHEN venue='home' THEN home_score ELSE away_score END) -
         SUM(CASE WHEN venue='home' THEN away_score ELSE home_score END)) AS goal_difference
      FROM matches
      WHERE status = 'completed' ${yearFilter}
    `);

    const [byVenue] = await db.execute(`
      SELECT
        venue,
        COUNT(*) AS played,
        SUM(CASE WHEN (venue='home' AND home_score>away_score) OR (venue='away' AND away_score>home_score) THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN home_score=away_score THEN 1 ELSE 0 END) AS draws,
        SUM(CASE WHEN (venue='home' AND home_score<away_score) OR (venue='away' AND away_score<home_score) THEN 1 ELSE 0 END) AS losses
      FROM matches
      WHERE status = 'completed' ${yearFilter}
      GROUP BY venue
    `);

    const [monthlyForm] = await db.execute(`
      SELECT
        DATE_FORMAT(match_date, '%Y-%m') AS month,
        COUNT(*) AS played,
        SUM(CASE WHEN (venue='home' AND home_score>away_score) OR (venue='away' AND away_score>home_score) THEN 1 ELSE 0 END) AS wins
      FROM matches
      WHERE status = 'completed' ${yearFilter}
      GROUP BY DATE_FORMAT(match_date, '%Y-%m')
      ORDER BY month ASC
    `);

    const [recentForm] = await db.execute(`
      SELECT
        CASE
          WHEN (venue='home' AND home_score>away_score) OR (venue='away' AND away_score>home_score) THEN 'W'
          WHEN home_score=away_score THEN 'D'
          ELSE 'L'
        END AS result
      FROM matches
      WHERE status = 'completed' ${yearFilter}
      ORDER BY match_date DESC
      LIMIT 5
    `);

    const stats = overall[0];
    const winPct = stats.total_matches > 0
      ? Math.round((stats.wins / stats.total_matches) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        statistics: { ...stats, win_percentage: winPct },
        byVenue,
        monthlyForm,
        recentForm: recentForm.map(r => r.result),
      },
    });
  } catch (error) {
    console.error('Season performance report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate season performance report' });
  }
};

// Ticket sales report
exports.getTicketSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, matchID, ticketType, paymentStatus } = req.query;

    let dateCondition = '';
    if (startDate && endDate)
      dateCondition = `AND b.booking_date BETWEEN '${startDate}' AND '${endDate}'`;

    let extraFilters = '';
    if (matchID)       extraFilters += ` AND b.matchID = ${matchID}`;
    if (ticketType)    extraFilters += ` AND b.ticket_type = '${ticketType}'`;
    if (paymentStatus) extraFilters += ` AND b.payment_status = '${paymentStatus}'`;

    const [byMatch] = await db.execute(`
      SELECT
        m.matchID, m.opponent, m.match_date, m.venue, m.competition,
        b.ticket_type,
        COUNT(b.bookingID) AS bookings_count,
        SUM(b.quantity) AS tickets_sold,
        SUM(b.total_amount) AS revenue,
        SUM(CASE WHEN b.payment_status='paid' THEN b.total_amount ELSE 0 END) AS paid_revenue,
        SUM(CASE WHEN b.payment_status='pending' THEN b.total_amount ELSE 0 END) AS pending_revenue,
        SUM(CASE WHEN b.payment_status='cancelled' THEN b.total_amount ELSE 0 END) AS cancelled_revenue,
        CASE WHEN COUNT(b.bookingID) > 0
          THEN ROUND(SUM(CASE WHEN b.payment_status='paid' THEN 1 ELSE 0 END) / COUNT(b.bookingID) * 100, 1)
          ELSE 0
        END AS conversion_rate
      FROM matches m
      LEFT JOIN bookings b ON m.matchID = b.matchID
      WHERE 1=1 ${dateCondition} ${extraFilters}
      GROUP BY m.matchID, b.ticket_type
      ORDER BY m.match_date DESC
    `);

    const [summary] = await db.execute(`
      SELECT
        ticket_type,
        COUNT(bookingID) AS total_bookings,
        SUM(quantity) AS total_tickets,
        SUM(total_amount) AS total_revenue,
        SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END) AS paid_revenue,
        AVG(total_amount / NULLIF(quantity, 0)) AS avg_ticket_price
      FROM bookings
      WHERE 1=1
        ${startDate && endDate ? `AND booking_date BETWEEN '${startDate}' AND '${endDate}'` : ''}
        ${ticketType ? `AND ticket_type = '${ticketType}'` : ''}
      GROUP BY ticket_type
    `);

    const [totals] = await db.execute(`
      SELECT
        COUNT(bookingID) AS total_bookings,
        SUM(quantity) AS total_tickets,
        SUM(total_amount) AS gross_revenue,
        SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END) AS net_revenue,
        ROUND(SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END) / COUNT(bookingID) * 100, 1) AS conversion_rate
      FROM bookings
      WHERE 1=1
        ${startDate && endDate ? `AND booking_date BETWEEN '${startDate}' AND '${endDate}'` : ''}
    `);

    return res.status(200).json({
      success: true,
      data: { byMatch, summary, totals: totals[0] },
    });
  } catch (error) {
    console.error('Ticket sales report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate ticket sales report' });
  }
};

// Revenue summary report
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    let dateCondition = '';
    if (startDate && endDate)
      dateCondition = `WHERE transaction_date BETWEEN '${startDate}' AND '${endDate}'`;

    let selectClause, groupByClause;
    if (groupBy === 'day') {
      selectClause   = "DATE(transaction_date) AS period";
      groupByClause  = "DATE(transaction_date)";
    } else if (groupBy === 'week') {
      selectClause   = "YEARWEEK(transaction_date) AS period";
      groupByClause  = "YEARWEEK(transaction_date)";
    } else if (groupBy === 'year') {
      selectClause   = "YEAR(transaction_date) AS period";
      groupByClause  = "YEAR(transaction_date)";
    } else {
      selectClause   = "DATE_FORMAT(transaction_date, '%Y-%m') AS period";
      groupByClause  = "DATE_FORMAT(transaction_date, '%Y-%m')";
    }

    const [breakdown] = await db.execute(`
      SELECT ${selectClause}, source,
        SUM(amount) AS total_amount,
        COUNT(*) AS transaction_count
      FROM revenue
      ${dateCondition}
      GROUP BY ${groupByClause}, source
      ORDER BY period DESC, source
    `);

    const [summary] = await db.execute(`
      SELECT source,
        SUM(amount) AS total_amount,
        COUNT(*) AS transaction_count,
        AVG(amount) AS average_amount
      FROM revenue
      ${dateCondition}
      GROUP BY source
    `);

    const [totals] = await db.execute(`
      SELECT
        SUM(amount) AS grand_total,
        COUNT(*) AS total_transactions,
        AVG(amount) AS avg_transaction
      FROM revenue
      ${dateCondition}
    `);

    // Revenue growth comparison
    const [growth] = await db.execute(`
      SELECT
        DATE_FORMAT(transaction_date, '%Y-%m') AS month,
        SUM(amount) AS total
      FROM revenue
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);

    return res.status(200).json({
      success: true,
      data: { breakdown, summary, totals: totals[0], growth },
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate revenue report' });
  }
};

// Match day revenue report
exports.getMatchDayRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, matchID, competition } = req.query;

    let matchFilters = ["m.status = 'completed'"];
    if (startDate && endDate) matchFilters.push(`m.match_date BETWEEN '${startDate}' AND '${endDate}'`);
    if (matchID)              matchFilters.push(`m.matchID = ${matchID}`);
    if (competition)          matchFilters.push(`m.competition = '${competition}'`);
    const matchWhere = `WHERE ${matchFilters.join(' AND ')}`;

    const [byMatch] = await db.execute(`
      SELECT
        m.matchID, m.opponent, m.match_date, m.venue, m.competition, m.attendance,
        COALESCE(SUM(b.total_amount), 0) AS ticket_revenue,
        COALESCE(SUM(CASE WHEN b.payment_status='paid' THEN b.total_amount ELSE 0 END), 0) AS paid_ticket_revenue,
        COALESCE(SUM(b.quantity), 0) AS tickets_sold,
        CASE
          WHEN m.attendance > 0 THEN ROUND(SUM(b.total_amount) / m.attendance, 2)
          ELSE 0
        END AS revenue_per_attendee
      FROM matches m
      LEFT JOIN bookings b ON m.matchID = b.matchID
      ${matchWhere}
      GROUP BY m.matchID
      ORDER BY m.match_date DESC
    `);

    const [averages] = await db.execute(`
      SELECT
        AVG(match_revenue) AS avg_match_revenue,
        MAX(match_revenue) AS max_match_revenue,
        MIN(match_revenue) AS min_match_revenue
      FROM (
        SELECT m.matchID, COALESCE(SUM(b.total_amount), 0) AS match_revenue
        FROM matches m
        LEFT JOIN bookings b ON m.matchID = b.matchID
        WHERE m.status = 'completed'
        GROUP BY m.matchID
      ) sub
    `);

    return res.status(200).json({
      success: true,
      data: { byMatch, averages: averages[0] },
    });
  } catch (error) {
    console.error('Match day revenue report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate match day revenue report' });
  }
};

// Membership overview report
exports.getMembershipReport = async (req, res) => {
  try {
    const { status = 'all' } = req.query;

    let whereCondition = '';
    if (status === 'active')  whereCondition = 'WHERE is_active = TRUE AND expiry_date >= CURDATE()';
    if (status === 'expired') whereCondition = 'WHERE is_active = FALSE OR expiry_date < CURDATE()';

    const [memberships] = await db.execute(`
      SELECT
        membershipID, full_name, email, phone,
        membership_number, membership_fee,
        join_date, expiry_date, is_active,
        DATEDIFF(expiry_date, CURDATE()) AS days_until_expiry
      FROM memberships
      ${whereCondition}
      ORDER BY join_date DESC
    `);

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) AS total_members,
        SUM(CASE WHEN is_active=TRUE AND expiry_date>=CURDATE() THEN 1 ELSE 0 END) AS active_members,
        SUM(CASE WHEN expiry_date<CURDATE() THEN 1 ELSE 0 END) AS expired_members,
        SUM(membership_fee) AS total_revenue,
        AVG(membership_fee) AS avg_fee
      FROM memberships
    `);

    const [expiring] = await db.execute(`
      SELECT COUNT(*) AS expiring_soon
      FROM memberships
      WHERE is_active=TRUE AND DATEDIFF(expiry_date, CURDATE()) BETWEEN 0 AND 30
    `);

    // New members this month
    const [newThisMonth] = await db.execute(`
      SELECT COUNT(*) AS new_this_month
      FROM memberships
      WHERE MONTH(join_date)=MONTH(CURDATE()) AND YEAR(join_date)=YEAR(CURDATE())
    `);

    // Monthly growth
    const [monthlyGrowth] = await db.execute(`
      SELECT
        DATE_FORMAT(join_date, '%Y-%m') AS month,
        COUNT(*) AS new_members
      FROM memberships
      GROUP BY DATE_FORMAT(join_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);

    return res.status(200).json({
      success: true,
      data: {
        memberships,
        statistics: {
          ...stats[0],
          expiring_soon: expiring[0].expiring_soon,
          new_this_month: newThisMonth[0].new_this_month,
        },
        monthlyGrowth,
      },
    });
  } catch (error) {
    console.error('Membership report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate membership report' });
  }
};

// Expiring memberships report
exports.getExpiringMembershipsReport = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const [expiring] = await db.execute(`
      SELECT
        membershipID, full_name, email, phone,
        membership_number, membership_fee,
        expiry_date,
        DATEDIFF(expiry_date, CURDATE()) AS days_until_expiry
      FROM memberships
      WHERE is_active = TRUE
        AND DATEDIFF(expiry_date, CURDATE()) BETWEEN 0 AND ${parseInt(days)}
      ORDER BY days_until_expiry ASC
    `);

    const [buckets] = await db.execute(`
      SELECT
        SUM(CASE WHEN DATEDIFF(expiry_date, CURDATE()) BETWEEN 0 AND 7 THEN 1 ELSE 0 END) AS within_7_days,
        SUM(CASE WHEN DATEDIFF(expiry_date, CURDATE()) BETWEEN 8 AND 30 THEN 1 ELSE 0 END) AS within_30_days,
        SUM(CASE WHEN DATEDIFF(expiry_date, CURDATE()) BETWEEN 31 AND 60 THEN 1 ELSE 0 END) AS within_60_days
      FROM memberships
      WHERE is_active = TRUE AND expiry_date >= CURDATE()
    `);

    return res.status(200).json({
      success: true,
      data: { expiring, buckets: buckets[0] },
    });
  } catch (error) {
    console.error('Expiring memberships report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate expiring memberships report' });
  }
};

// Poll results report
exports.getPollResultsReport = async (req, res) => {
  try {
    const { matchID, status } = req.query;

    let whereConditions = [];
    if (matchID) whereConditions.push(`p.matchID = ${matchID}`);
    if (status === 'active')   whereConditions.push(`p.is_active = TRUE`);
    if (status === 'closed')   whereConditions.push(`p.is_active = FALSE`);
    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Adjust column names to schema
    const [polls] = await db.execute(`
      SELECT
        p.pollID, p.question, p.description, p.is_active, p.created_at,
        m.opponent AS match_opponent, m.match_date,
        COUNT(pv.voteID) AS total_votes
      FROM polls p
      LEFT JOIN matches m ON p.matchID = m.matchID
      LEFT JOIN poll_votes pv ON p.pollID = pv.pollID
      ${whereClause}
      GROUP BY p.pollID
      ORDER BY p.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: { polls },
    });
  } catch (error) {
    console.error('Poll results report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate poll results report' });
  }
};

// Attendance report
exports.getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateCondition = '';
    if (startDate && endDate)
      dateCondition = `AND match_date BETWEEN '${startDate}' AND '${endDate}'`;

    const [matches] = await db.execute(`
      SELECT matchID, opponent, match_date, venue, competition, attendance, home_score, away_score
      FROM matches
      WHERE status='completed' AND attendance IS NOT NULL ${dateCondition}
      ORDER BY match_date DESC
    `);

    const [stats] = await db.execute(`
      SELECT
        AVG(attendance) AS avg_attendance,
        MAX(attendance) AS max_attendance,
        MIN(attendance) AS min_attendance,
        SUM(attendance) AS total_attendance,
        COUNT(*) AS matches_with_data
      FROM matches
      WHERE status='completed' AND attendance IS NOT NULL ${dateCondition}
    `);

    const [byVenue] = await db.execute(`
      SELECT
        venue,
        AVG(attendance) AS avg_attendance,
        MAX(attendance) AS max_attendance,
        COUNT(*) AS match_count
      FROM matches
      WHERE status='completed' AND attendance IS NOT NULL ${dateCondition}
      GROUP BY venue
    `);

    const [byCompetition] = await db.execute(`
      SELECT
        competition,
        AVG(attendance) AS avg_attendance,
        SUM(attendance) AS total_attendance,
        COUNT(*) AS match_count
      FROM matches
      WHERE status='completed' AND attendance IS NOT NULL ${dateCondition}
      GROUP BY competition
    `);

    return res.status(200).json({
      success: true,
      data: { matches, statistics: stats[0], byVenue, byCompetition },
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate attendance report' });
  }
};

// Executive dashboard report
exports.getExecutiveDashboardReport = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter = '';
    if (period === 'week')   dateFilter = "AND booking_date >= DATE_SUB(NOW(), INTERVAL 1 WEEK)";
    if (period === 'month')  dateFilter = "AND booking_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
    if (period === 'season') dateFilter = "AND YEAR(booking_date) = YEAR(NOW())";

    let revDateFilter = dateFilter.replace('booking_date', 'transaction_date');
    let matchDateFilter = dateFilter.replace('booking_date', 'match_date');
    let memberDateFilter = dateFilter.replace('booking_date', 'join_date');

    const [revenue] = await db.execute(`
      SELECT SUM(amount) AS total_revenue, COUNT(*) AS total_transactions
      FROM revenue WHERE 1=1 ${revDateFilter}
    `);

    const [tickets] = await db.execute(`
      SELECT SUM(quantity) AS total_tickets, SUM(total_amount) AS ticket_revenue
      FROM bookings WHERE payment_status='paid' ${dateFilter}
    `);

    const [members] = await db.execute(`
      SELECT COUNT(*) AS active_members
      FROM memberships WHERE is_active=TRUE AND expiry_date>=CURDATE()
    `);

    const [matchStats] = await db.execute(`
      SELECT
        COUNT(*) AS total_matches,
        SUM(CASE WHEN (venue='home' AND home_score>away_score) OR (venue='away' AND away_score>home_score) THEN 1 ELSE 0 END) AS wins
      FROM matches WHERE status='completed' ${matchDateFilter}
    `);

    const [topScorers] = await db.execute(`
      SELECT name, jersey_number, position, goals, assists, appearances
      FROM players WHERE is_active=TRUE
      ORDER BY goals DESC LIMIT 5
    `);

    const [upcomingFixtures] = await db.execute(`
      SELECT matchID, opponent, match_date, venue, competition,
        DATEDIFF(match_date, CURDATE()) AS days_away
      FROM matches
      WHERE status='upcoming' AND match_date >= CURDATE()
      ORDER BY match_date ASC LIMIT 3
    `);

    const [recentNews] = await db.execute(`
      SELECT newsID, title, category, created_at
      FROM news ORDER BY created_at DESC LIMIT 5
    `);

    const ms = matchStats[0];
    const winPct = ms.total_matches > 0 ? Math.round((ms.wins / ms.total_matches) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          total_revenue: revenue[0].total_revenue || 0,
          total_tickets: tickets[0].total_tickets || 0,
          ticket_revenue: tickets[0].ticket_revenue || 0,
          active_members: members[0].active_members || 0,
          total_matches: ms.total_matches || 0,
          win_percentage: winPct,
        },
        topScorers,
        upcomingFixtures,
        recentNews,
      },
    });
  } catch (error) {
    console.error('Executive dashboard report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate executive dashboard report' });
  }
};

// Export report to CSV
exports.exportReportCSV = async (req, res) => {
  try {
    const { reportType, ...filters } = req.query;

    const fakeRes = { _data: null };
    const mockRes = {
      status: () => ({ json: (d) => { fakeRes._data = d; return d; } }),
    };

    const reportMap = {
      revenue:            exports.getRevenueReport,
      tickets:            exports.getTicketSalesReport,
      'match-performance':exports.getMatchPerformanceReport,
      'player-performance':exports.getPlayerPerformanceReport,
      attendance:         exports.getAttendanceReport,
      membership:         exports.getMembershipReport,
      fixtures:           exports.getFixturesReport,
      'squad-overview':   exports.getSquadOverviewReport,
      'top-scorers':      exports.getTopScorersReport,
      'season-performance':exports.getSeasonPerformanceReport,
      'match-day-revenue':exports.getMatchDayRevenueReport,
      'expiring-memberships':exports.getExpiringMembershipsReport,
    };

    const handler = reportMap[reportType];
    if (!handler) return res.status(400).json({ success: false, message: 'Invalid report type' });

    await handler({ query: filters }, mockRes);
    const result = fakeRes._data;
    if (!result || !result.success) return res.status(500).json({ success: false, message: 'Could not fetch data' });

    // Extract tabular data from report
    const dataExtractors = {
      revenue:              (d) => d.breakdown,
      tickets:              (d) => d.byMatch,
      'match-performance':  (d) => d.matches,
      'player-performance': (d) => d.players,
      attendance:           (d) => d.matches,
      membership:           (d) => d.memberships,
      fixtures:             (d) => d.fixtures,
      'squad-overview':     (d) => d.squad,
      'top-scorers':        (d) => d.topScorers,
      'season-performance': (d) => d.byVenue,
      'match-day-revenue':  (d) => d.byMatch,
      'expiring-memberships':(d) => d.expiring,
    };

    const extractor = dataExtractors[reportType];
    const data = extractor ? extractor(result.data) : [];

    if (!data || data.length === 0)
      return res.status(404).json({ success: false, message: 'No data to export' });

    const escape = (val) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(escape).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ success: false, message: 'Failed to export report' });
  }
};