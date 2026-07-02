export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const familyId = req.params.familyId || req.query.familyId || req.body.familyId;

      if (!familyId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Family Context ID is required for role verification', status: 400 }
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required', status: 401 }
        });
      }

      // Check if user is a member of the targeted family and has one of the allowed roles
      const membership = req.user.memberships.find(m => m.familyId === familyId);

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: { message: 'You are not a member of this family', status: 403 }
        });
      }

      const rolePriority = {
        'FOUNDER': 3,
        'HISTORIAN': 2,
        'MEMBER': 1
      };

      const hasRequiredRole = allowedRoles.some(role => {
        // If user is FOUNDER, they have HISTORIAN and MEMBER rights too
        return rolePriority[membership.role] >= rolePriority[role];
      });

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          error: { message: 'Insufficient family permission level', status: 403 }
        });
      }

      req.familyRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
};
