import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { normalizePhone, validatePhone } from '../lib/phone';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone: rawPhone, businessId } = req.body;

    if (!name || !rawPhone || !businessId) {
      return res.status(400).json({ error: 'name, phone y businessId son requeridos' });
    }

    const phone = normalizePhone(rawPhone);

    const phoneError = validatePhone(phone);
    if (phoneError) {
      return res.status(400).json({ error: phoneError });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return res.status(404).json({ error: `Negocio no encontrado. ID: ${businessId}. ¿Copiaste bien el ID del QR?` });
    }

    const existing = await prisma.customer.findUnique({
      where: { phone_businessId: { phone, businessId } },
    });

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: { lastVisit: new Date() },
      });

      return res.status(200).json({ ...existing, lastVisit: new Date(), returning: true });
    }

    const customer = await prisma.customer.create({
      data: { name, phone, businessId, lastVisit: new Date() },
    });

    return res.status(201).json({ ...customer, returning: false });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Customer] Error en registro:', msg, error);
    return res.status(500).json({ error: msg || 'Error interno del servidor' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone: rawPhone, businessId } = req.body;

    if (!rawPhone || !businessId) {
      return res.status(400).json({ error: 'phone y businessId son requeridos' });
    }

    const phone = normalizePhone(rawPhone);

    const phoneError = validatePhone(phone);
    if (phoneError) {
      return res.status(400).json({ error: phoneError });
    }

    const customer = await prisma.customer.findUnique({
      where: { phone_businessId: { phone, businessId } },
    });

    if (!customer) {
      return res.status(404).json({ error: 'No encontramos una cuenta con ese número en este negocio' });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastVisit: new Date() },
    });

    return res.json({ ...customer, lastVisit: new Date() });
  } catch (error) {
    console.error('[Customer] Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/business/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { filter } = req.query;

    const where: Record<string, unknown> = { businessId };

    if (filter === 'inactive') {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      where.lastVisit = { lt: fifteenDaysAgo };
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: { select: { stamps: true } },
        stamps: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { program: { select: { title: true } } },
        },
      },
      orderBy: { lastVisit: { sort: 'desc', nulls: 'last' } },
    });

    return res.json(customers);
  } catch (error) {
    console.error('[Customer] Error al listar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id/stamps', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        stamps: {
          orderBy: { createdAt: 'desc' },
          include: { program: true },
        },
        business: {
          select: { name: true, id: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const programCounts: Record<string, number> = {};
    customer.stamps.forEach((s) => {
      programCounts[s.programId] = (programCounts[s.programId] || 0) + 1;
    });

    return res.json({ customer, programCounts });
  } catch (error) {
    console.error('[Customer] Error al obtener sellos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id/notes', async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { notes },
    });
    return res.json(customer);
  } catch (error) {
    console.error('[Customer] Error al guardar notas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        stamps: {
          orderBy: { createdAt: 'desc' },
          include: { program: { select: { id: true, title: true } } },
        },
        redemptions: {
          orderBy: { redeemedAt: 'desc' },
          include: { program: { select: { title: true, reward: true } } },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const stamps = customer.stamps;
    const redemptions = customer.redemptions;
    const totalStamps = stamps.length;
    const totalRedemptions = redemptions.length;

    let avgDaysBetweenVisits = 0;
    let firstVisit: string | null = null;
    let lastVisit: string | null = null;

    if (stamps.length > 0) {
      const dates = stamps.map((s) => new Date(s.createdAt).getTime()).sort((a, b) => a - b);
      firstVisit = stamps[stamps.length - 1].createdAt.toISOString();
      lastVisit = stamps[0].createdAt.toISOString();
      if (dates.length >= 2) {
        const totalMs = dates[dates.length - 1] - dates[0];
        avgDaysBetweenVisits = Math.round((totalMs / (dates.length - 1)) / (1000 * 60 * 60 * 24) * 10) / 10;
      }
    }

    const alerts: { date: string; count: number; level: string; msg: string }[] = [];
    const byDay: Record<string, { count: number; times: Date[] }> = {};

    stamps.forEach((s) => {
      const d = new Date(s.createdAt);
      const key = d.toISOString().slice(0, 10);
      if (!byDay[key]) byDay[key] = { count: 0, times: [] };
      byDay[key].count++;
      byDay[key].times.push(d);
    });

    Object.entries(byDay).forEach(([date, data]) => {
      if (data.count >= 4) {
        alerts.push({ date, count: data.count, level: 'danger', msg: `${data.count} sellos el mismo día — revisar` });
      } else if (data.count >= 2) {
        const sorted = data.times.sort((a, b) => a.getTime() - b.getTime());
        let close = false;
        for (let i = 1; i < sorted.length; i++) {
          if ((sorted[i].getTime() - sorted[i - 1].getTime()) < 5 * 60 * 1000) {
            close = true;
            break;
          }
        }
        if (close) {
          alerts.push({ date, count: data.count, level: 'danger', msg: 'Sellos con menos de 5 min de diferencia' });
        } else {
          alerts.push({ date, count: data.count, level: 'warning', msg: `${data.count} visitas el mismo día` });
        }
      }
    });

    return res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        createdAt: customer.createdAt,
        lastVisit: customer.lastVisit,
      },
      stamps: stamps.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        program: s.program,
      })),
      redemptions: redemptions.map((r) => ({
        id: r.id,
        redeemedAt: r.redeemedAt,
        program: r.program,
      })),
      stats: { totalStamps, totalRedemptions, avgDaysBetweenVisits, firstVisit, lastVisit },
      alerts,
    });
  } catch (error) {
    console.error('[Customer] Error al obtener historial:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
