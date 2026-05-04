import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { sendReactivationMessage } from '../services/whatsapp';

const router = Router();

router.post('/reactivate', async (req: Request, res: Response) => {
  try {
    const { businessId, customerIds } = req.body;

    if (!businessId || !customerIds || !Array.isArray(customerIds)) {
      return res.status(400).json({ error: 'businessId y customerIds (array) son requeridos' });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds }, businessId },
    });

    const results = await Promise.allSettled(
      customers.map((c) =>
        sendReactivationMessage(c.phone, c.name, business.name)
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - sent;

    return res.json({ sent, failed, total: results.length });
  } catch (error) {
    console.error('[WhatsApp] Error en reactivación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
