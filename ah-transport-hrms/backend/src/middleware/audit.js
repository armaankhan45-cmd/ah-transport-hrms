const { getDb } = require('../db/database');

function audit(action, entity_type=null, severity='low') {
  return (req, res, next) => {
    const start = Date.now();
    const origJson = res.json;
    let responseBody = null;
    res.json = function(body) {
      responseBody = body;
      return origJson.call(this, body);
    };
    res.on('finish', () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          const db = getDb();
          db.prepare(`
            INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, office_id, ip_address, user_agent, new_values, severity)
            VALUES (?,?,?,?,?,?,?,?,?,?)
          `).run(
            req.user?.id || null,
            req.user?.email || null,
            action,
            entity_type,
            req.params.id || responseBody?.id || null,
            req.user?.office_id || null,
            req.ip,
            req.get('user-agent')?.substring(0,250),
            JSON.stringify({ method: req.method, path: req.originalUrl, status: res.statusCode }).substring(0,2000),
            severity
          );
        }
      } catch(e){}
    });
    next();
  };
}

module.exports = { audit };
