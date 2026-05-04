import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { normalizePhone, validatePhone } from '../lib/phone';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone: rawPhone, type } = req.body;

    if (!name || !rawPhone || !type) {
      return res.status(400).json({ error: 'name, phone y type son requeridos' });
    }

    const phone = normalizePhone(rawPhone);
    const phoneError = validatePhone(phone);
    if (phoneError) {
      return res.status(400).json({ error: phoneError });
    }

    const existing = await prisma.business.findUnique({ where: { phone } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un negocio con ese teléfono' });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const business = await prisma.business.create({
      data: {
        name,
        phone,
        type,
        plan: 'trial',
        subscription: { create: { plan: 'trial', trialEndsAt } },
      },
    });

    return res.status(201).json({ ...business, pin: undefined });
  } catch (error) {
    console.error('[Business] Error en registro:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone: rawPhone, pin } = req.body;

    if (!rawPhone || !pin) {
      return res.status(400).json({ error: 'Teléfono y PIN son requeridos' });
    }

    const phone = normalizePhone(rawPhone);
    const business = await prisma.business.findUnique({ where: { phone } });

    if (!business) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!business.pin) {
      return res.status(403).json({ error: 'PIN no configurado', needSetup: true, businessId: business.id });
    }

    const valid = await bcrypt.compare(pin, business.pin);
    if (!valid) {
      return res.status(401).json({ error: 'PIN incorrecto' });
    }

    const full = await prisma.business.findUnique({
      where: { id: business.id },
      include: {
        subscription: true,
        programs: true,
        _count: { select: { customers: true, stamps: true } },
      },
    });

    return res.json({ ...full, pin: undefined });
  } catch (error) {
    console.error('[Business] Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id/pin', async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'El PIN debe ser de 4 dígitos numéricos' });
    }

    const hash = await bcrypt.hash(pin, 10);
    await prisma.business.update({ where: { id: req.params.id }, data: { pin: hash } });

    return res.json({ success: true });
  } catch (error) {
    console.error('[Business] Error al setear PIN:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id/profile', async (req: Request, res: Response) => {
  try {
    const { email, address, ownerName } = req.body;
    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: { email, address, ownerName },
    });
    return res.json({ ...business, pin: undefined });
  } catch (error) {
    console.error('[Business] Error al actualizar perfil:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        programs: true,
        subscription: true,
        _count: { select: { customers: true, stamps: true } },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    return res.json({ ...business, pin: undefined });
  } catch (error) {
    console.error('[Business] Error al obtener negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/phone/:phone', async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.params.phone);
    const business = await prisma.business.findUnique({
      where: { phone },
      select: { id: true, name: true, phone: true, pin: true },
    });

    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    return res.json({ ...business, hasPin: !!business.pin });
  } catch (error) {
    console.error('[Business] Error al buscar por teléfono:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const businessId = req.params.id;

    const [totalCustomers, stampsThisMonth, redemptionsThisMonth] = await Promise.all([
      prisma.customer.count({ where: { businessId } }),
      prisma.stamp.count({
        where: { businessId, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      prisma.redemption.count({
        where: { program: { businessId }, redeemedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
    ]);

    return res.json({ totalCustomers, stampsThisMonth, redemptionsThisMonth });
  } catch (error) {
    console.error('[Business] Error al obtener stats:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
