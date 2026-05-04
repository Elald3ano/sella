import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerId, programId } = req.body;

    if (!customerId || !programId) {
      return res.status(400).json({ error: 'customerId y programId son requeridos' });
    }

    const program = await prisma.program.findUnique({ where: { id: programId } });
    if (!program) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    const stampCount = await prisma.stamp.count({ where: { customerId, programId } });

    if (stampCount < program.target) {
      return res.status(400).json({
        error: 'Cliente no ha alcanzado la meta',
        stamps: stampCount,
        target: program.target,
        remaining: program.target - stampCount,
      });
    }

    const redemption = await prisma.redemption.create({
      data: { customerId, programId },
    });

    const stampsToDelete = await prisma.stamp.findMany({
      where: { customerId, programId },
      orderBy: { createdAt: 'asc' },
      take: program.target,
    });

    await prisma.stamp.deleteMany({
      where: { id: { in: stampsToDelete.map((s) => s.id) } },
    });

    return res.status(201).json({ redemption, stampsUsed: program.target });
  } catch (error) {
    console.error('[Redemption] Error al canjear:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/business/:businessId', async (req: Request, res: Response) => {
  try {
    const redemptions = await prisma.redemption.findMany({
      where: { program: { businessId: req.params.businessId } },
      include: {
        customer: { select: { name: true, phone: true } },
        program: { select: { title: true, reward: true } },
      },
      orderBy: { redeemedAt: 'desc' },
      take: 50,
    });

    return res.json(redemptions);
  } catch (error) {
    console.error('[Redemption] Error al listar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
