import express from 'express';
import cors from 'cors';
import businessesRouter from './routes/businesses';
import programsRouter from './routes/programs';
import customersRouter from './routes/customers';
import stampsRouter from './routes/stamps';
import redemptionsRouter from './routes/redemptions';
import whatsappRouter from './routes/whatsapp';
import stampRequestsRouter from './routes/stamp-requests';
import adminRouter from './routes/admin';
import adminBusinessesRouter from './routes/admin-businesses';
import { generateBusinessQR } from './services/qr';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/s/:businessId', async (req, res) => {
  try {
    const baseUrl = req.query.baseUrl as string | undefined;
    const { qr, url } = await generateBusinessQR(req.params.businessId, baseUrl);
    res.json({ qr, url, businessId: req.params.businessId });
  } catch (error) {
    console.error('[QR] Error al generar:', error);
    res.status(500).json({ error: 'Error al generar QR' });
  }
});

app.use('/api/businesses', businessesRouter);
app.use('/api/programs', programsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/stamps', stampsRouter);
app.use('/api/redemptions', redemptionsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/stamp-requests', stampRequestsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', adminBusinessesRouter);

app.listen(PORT, () => {
  console.log(`[Sella Backend] Corriendo en http://localhost:${PORT}`);
});
