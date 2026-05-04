import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
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

    const existing = await prisma.stampRequest.findFirst({
      where: { customerId, businessId, status: 'pending' },
    });

    if (existing) {
      return res.status(409).json({ error: 'Ya tienes una solicitud pendiente en este negocio' });
    }

    const request = await prisma.stampRequest.create({
      data: { customerId, businessId, programId: programId || null },
    });

    return res.status(201).json(request);
  } catch (error) {
    console.error('[StampRequest] Error al crear:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/business/:businessId', async (req: Request, res: Response) => {
  try {
    const requests = await prisma.stampRequest.findMany({
      where: { businessId: req.params.businessId, status: 'pending' },
      include: {
        customer: { select: { name: true, phone: true } },
        program: { select: { id: true, title: true, target: true, reward: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error) {
    console.error('[StampRequest] Error al listar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const request = await prisma.stampRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }

    const overrideProgramId = req.body.programId as string | undefined;
    const targetProgramId = overrideProgramId || request.programId;

    let program;
    if (targetProgramId) {
      program = await prisma.program.findUnique({ where: { id: targetProgramId } });
    }

    if (!program) {
      program = await prisma.program.findFirst({
        where: { businessId: request.businessId, active: true },
      });
    }

    if (!program) {
      return res.status(404).json({ error: 'El negocio no tiene programas activos' });
    }

    const [stamp] = await prisma.$transaction([
      prisma.stamp.create({
        data: {
          customerId: request.customerId,
          businessId: request.businessId,
          programId: program.id,
        },
      }),
      prisma.stampRequest.update({
        where: { id: request.id },
        data: { status: 'approved' },
      }),
      prisma.customer.update({
        where: { id: request.customerId },
        data: { lastVisit: new Date() },
      }),
    ]);

    const stampCount = await prisma.stamp.count({
      where: { customerId: request.customerId, programId: program.id },
    });

    return res.json({
      stamp,
      stampCount,
      target: program.target,
      reward: program.reward,
      completed: stampCount >= program.target,
      customerName: (await prisma.customer.findUnique({ where: { id: request.customerId } }))?.name,
    });
  } catch (error) {
    console.error('[StampRequest] Error al aprobar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const request = await prisma.stampRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }

    await prisma.stampRequest.update({
      where: { id: request.id },
      data: { status: 'rejected' },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[StampRequest] Error al rechazar:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
