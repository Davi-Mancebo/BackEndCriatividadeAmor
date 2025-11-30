import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import path from 'path';

import { errorHandler } from './middlewares/error.middleware';

// Rotas
import authRoutes from './routes/auth.routes';
import ordersRoutes from './routes/orders.routes';
import productsRoutes from './routes/products.routes';
import productImagesRoutes from './routes/product-images.routes';
import promotionsRoutes from './routes/promotions.routes';
import paymentsRoutes from './routes/payments.routes';
import digitalFilesRoutes from './routes/digital-files.routes';
import purchasesRoutes from './routes/purchases.routes';
import notificationsRoutes from './routes/notifications.routes';

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
app.use('/api/products', productsRoutes);
app.use('/api/products', productImagesRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/digital-files', digitalFilesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/notifications', notificationsRoutes);

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
