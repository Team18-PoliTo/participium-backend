import { Router } from 'express';
import InternalUserController from '../controllers/InternalUserController';
import InternalUserService from '../services/internalUserService';
import InternalUserRepository from '../repositories/InternalUserRepository';

const router = Router();

// Dependency Injection Setup
const internalUserRepository = new InternalUserRepository();
const internalUserService = new InternalUserService(internalUserRepository);
const internalUserController = new InternalUserController(internalUserService);

//GET /users - GET all internalUsers
router.get('/users',internalUserController.fetch.bind(internalUserController));

// POST /register - Register a new internalUser
router.post('/addEmployee', internalUserController.create.bind(internalUserController));

// PUT /updateEmployee/:id
router.put('/updateEmployee/:id', internalUserController.update.bind(internalUserController));

export default router;
