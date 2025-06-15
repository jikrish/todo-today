import express from 'express';
import passport from 'passport';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req: AuthRequest, res) => {
    res.redirect(process.env.CLIENT_URL as string);
  }
);

router.get('/me', (req: AuthRequest, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

router.get('/logout', (req: AuthRequest, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

export default router; 