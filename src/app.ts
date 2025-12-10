// DOTENV - MUST BE FIRST!
import dotenv from 'dotenv';
dotenv.config(); 
// DOTENV END

import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import citizenRoutes from './routes/citizenRoutes';
import internalUserRoutes from './routes/internalUserRoutes';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import roleRoutes from './routes/roleRoutes';
import { requireAuth, requireAdmin, requireCitizen, requireInternalUser } from './middleware/authMiddleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import reportRoutes from './routes/reportRoutes';
import categoryRoutes from "./routes/categoryRoutes";
import fileRoutes from "./routes/fileRoutes";
import companyRoutes from "./routes/companyRoutes";

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));


// MinIO initialization is called from server.ts after database is ready
// This ensures proper initialization order: DB -> MinIO -> Seed Reports

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Participium API is running' });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);

// Citizen routes (authentication handled at endpoint level)
app.use('/api/citizens', citizenRoutes);
app.use('/api/citizens', requireAuth, requireCitizen, reportRoutes);

// Categories
app.use('/api/categories', categoryRoutes);

// Companies
app.use('/api/companies', requireAuth, requireInternalUser, companyRoutes);

// File upload/management routes (authenticated users)
app.use('/api/files', requireAuth, fileRoutes);

// Protected internal user routes (for PR officers, technical officers, etc. - internal user report operations)
app.use('/api/internal', requireAuth, requireInternalUser, internalUserRoutes);

// Protected admin-only routes (admin user management and roles)
app.use('/api/admin/internal-users', requireAuth, requireAdmin, adminRoutes);
app.use('/api/admin/roles', requireAuth, requireAdmin, roleRoutes);



export default app;


