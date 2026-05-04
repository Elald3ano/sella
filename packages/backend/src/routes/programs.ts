import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { businessId, title, target, reward, type } = req.body;

    if (!businessId || !title || !target || !reward) {
      return res.status(400).json({ error: 'businessId, title, target y reward son requeridos' });
    }

    const program = await prisma.program.create({
      data: {
        title,
        target: Number(target),
        reward,
        type: type || 'stamps',
        businessId,
      },
    });

    return res.status(201).json(program);
  } catch (error) {
    console.error('[Program] Error al crear:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/business/:businessId', async (req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      where: { businessId: req.params.businessId, active: true },
      include: {
        _count: { select: { stamps: true, redemptions: true } },
      },
    });

    return res.json(programs);
  } catch (error) {
    console.error('[Program] Error al listar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, target, reward, active } = req.body;

    const program = await prisma.program.update({
      where: { id: req.params.id },
      data: { title, target, reward, active },
    });

    return res.json(program);
  } catch (error) {
    console.error('[Program] Error al actualizar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
