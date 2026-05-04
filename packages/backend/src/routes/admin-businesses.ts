import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { adminAuth } from './admin';

const router = Router();
router.use(adminAuth);

router.get('/businesses', async (_req: Request, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      include: {
        subscription: true,
        _count: { select: { customers: true, stamps: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = businesses.map((b) => ({
      id: b.id,
      name: b.name,
      phone: b.phone,
      type: b.type,
      plan: b.plan,
      active: b.active,
      createdAt: b.createdAt,
      subscription: b.subscription,
      customersCount: b._count.customers,
      stampsCount: b._count.stamps,
    }));

    return res.json(data);
  } catch (error) {
    console.error('[Admin] Error al listar negocios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/businesses/:id', async (req: Request, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        subscription: true,
        programs: true,
        _count: { select: { customers: true, stamps: true } },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    return res.json(business);
  } catch (error) {
    console.error('[Admin] Error al ver negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/businesses/:id/plan', async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    if (!plan || !['free', 'basic', 'pro'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido. Debe ser free, basic o pro.' });
    }

    const business = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const [updated] = await prisma.$transaction([
      prisma.business.update({ where: { id: req.params.id }, data: { plan } }),
      prisma.subscription.update({
        where: { businessId: req.params.id },
        data: { plan, startedAt: new Date() },
      }),
    ]);

    return res.json(updated);
  } catch (error) {
    console.error('[Admin] Error al cambiar plan:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [businessesCount, customersCount, stampsCount, plans] = await Promise.all([
      prisma.business.count(),
      prisma.customer.count(),
      prisma.stamp.count(),
      prisma.business.groupBy({ by: ['plan'], _count: true }),
    ]);

    const byPlan: Record<string, number> = {};
    plans.forEach((p) => {
      byPlan[p.plan] = p._count;
    });

    const trialEnding = await prisma.subscription.count({
      where: {
        plan: 'trial',
        status: 'active',
        trialEndsAt: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
    });

    return res.json({
      businessesCount,
      customersCount,
      stampsCount,
      byPlan,
      trialEnding,
    });
  } catch (error) {
    console.error('[Admin] Error en stats:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
