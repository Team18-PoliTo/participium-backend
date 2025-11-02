import { Router } from 'express';
import UserController from '../controllers/userController';
import UserService from '../services/userService';
import UserRepository from '../repositories/UserRepository';

const router = Router();

// Dependency Injection Setup
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// POST /register - Register a new user
router.post('/register', userController.register.bind(userController));

export default router;

