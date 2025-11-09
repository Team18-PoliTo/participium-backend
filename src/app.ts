import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import userRoutes from './routes/userRoutes';
import internalUserRoutes from './routes/internalUserRoutes';
import { requireAuth, requireAdmin } from './middleware/authMiddleware';
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Participium API is running' });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Public (citizen) routes
app.use('/api/users', userRoutes);

// Protected admin-only routes
app.use('/api/admin', requireAuth, requireAdmin, internalUserRoutes);

export default app;


