import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import path from 'path';

import { errorHandler } from './middlewares/error.middleware';

// Rotas (importação centralizada)
import {
  authRoutes,
  notificationsRoutes,
  ordersRoutes,
  productsRoutes,
  promotionsRoutes,
  digitalFilesRoutes,
  purchasesRoutes,
  paymentsRoutes,
  reviewsRoutes,
  customersRoutes,
  salesGoalsRoutes,
} from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes); // Inclui rotas de imagens de produtos
app.use('/api/promotions', promotionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/digital-files', digitalFilesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sales-goals', salesGoalsRoutes);

// Rota 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler (deve ser o último middleware)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
