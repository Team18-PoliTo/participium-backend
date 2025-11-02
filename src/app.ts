import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Participium API is running' });
});

export default app;

