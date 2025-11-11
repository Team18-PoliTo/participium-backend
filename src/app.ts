import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import citizenRoutes from './routes/citizenRoutes';
import internalUserRoutes from './routes/internalUserRoutes';
import authRoutes from './routes/authRoutes';
import roleRoutes from './routes/roleRoutes';
import { requireAuth, requireAdmin } from './middleware/authMiddleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { initMinio } from "./config/initMinio";


const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


( async () =>{

  await initMinio();

})();

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Participium API is running' });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);

// Public (citizen) routes
app.use('/api/citizens', citizenRoutes);

// Protected admin-only routes
app.use('/api/admin/internal-users', requireAuth, requireAdmin, internalUserRoutes);
app.use('/api/admin/roles', requireAuth, requireAdmin, roleRoutes);

export default app;


