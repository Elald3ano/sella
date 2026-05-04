import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.post('/visit', async (req: Request, res: Response) => {
  try {
    const { customerId, businessId, programId } = req.body;

    if (!customerId || !businessId) {
      return res.status(400).json({ error: 'customerId y businessId son requeridos' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no pertenece a este negocio' });
    }

    let program;
    if (programId) {
      program = await prisma.program.findUnique({ where: { id: programId } });
    }

    if (!program) {
      program = await prisma.program.findFirst({
        where: { businessId, active: true },
      });
    }

    if (!program) {
      return res.status(404).json({ error: 'El negocio no tiene programas activos' });
    }

    const stamp = await prisma.stamp.create({
      data: { customerId, businessId, programId: program.id },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastVisit: new Date() },
    });

    const stampCount = await prisma.stamp.count({
      where: { customerId, programId: program.id },
    });

    return res.status(201).json({
      stamp,
      stampCount,
      target: program.target,
      reward: program.reward,
      completed: stampCount >= program.target,
    });
  } catch (error) {
    console.error('[Stamp] Error en visita:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerId, businessId, programId } = req.body;

    if (!customerId || !businessId || !programId) {
      return res.status(400).json({ error: 'customerId, businessId y programId son requeridos' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no pertenece a este negocio' });
    }

    const stamp = await prisma.stamp.create({
      data: { customerId, businessId, programId },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastVisit: new Date() },
    });

    const stampCount = await prisma.stamp.count({
      where: { customerId, programId },
    });

    return res.status(201).json({ stamp, stampCount });
  } catch (error) {
    console.error('[Stamp] Error al otorgar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/customer/:customerId/program/:programId', async (req: Request, res: Response) => {
  try {
    const { customerId, programId } = req.params;

    const [stamps, program, redemptions] = await Promise.all([
      prisma.stamp.count({ where: { customerId, programId } }),
      prisma.program.findUnique({ where: { id: programId } }),
      prisma.redemption.count({ where: { customerId, programId } }),
    ]);

    return res.json({
      stamps,
      target: program?.target || 0,
      reward: program?.reward || '',
      redemptions,
      completed: program ? stamps >= program.target : false,
      remaining: program ? Math.max(0, program.target - stamps) : 0,
    });
  } catch (error) {
    console.error('[Stamp] Error al contar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
