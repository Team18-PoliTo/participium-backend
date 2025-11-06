import { Router } from 'express';
import InternalUserController from '../controllers/InternalUserController';
import InternalUserService from '../services/internalUserService';
import InternalUserRepository from '../repositories/InternalUserRepository';

const router = Router();

// Dependency Injection Setup
const internalUserRepository = new InternalUserRepository();
const internalUserService = new InternalUserService(internalUserRepository);
const internalUserController = new InternalUserController(internalUserService);

// POST /register - Register a new internalUser
// to add authorization layer - only for admin users
router.post('/addEmployee', internalUserController.create.bind(internalUserController));

// PUT /updateEmployee/:id - Update an existing internalUser
// to add authorization layer - only for admin users
router.put('/updateEmployee/:id', internalUserController.update.bind(internalUserController));

export default router;

