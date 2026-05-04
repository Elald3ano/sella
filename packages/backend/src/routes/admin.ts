import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'sella-admin-secret-change-in-production';
const router = Router();

function adminAuth(req: Request, res: Response, next: Function) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const token = auth.slice(7);
    (req as any).admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('[Admin] Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/me', adminAuth, (req: Request, res: Response) => {
  return res.json((req as any).admin);
});

export { adminAuth };
export default router;
