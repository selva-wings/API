const { getUserInfo } = require("./keycloakService");

const authenticateRole = (requiredRole) => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Missing token" });

    try {
      const userInfo = await getUserInfo(req.body.realm, token);
      const userRoles = userInfo.realm_access?.roles || [];

      if (!userRoles.includes(requiredRole)) {
        return res
          .status(403)
          .json({ error: `Forbidden: Requires ${requiredRole} role` });
      }

      req.user = userInfo;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  };
};

module.exports = { authenticateRole };
