import { Router } from 'express';
import UserRepository from '../repositories/UserRepository';
import AdminService from '../services/adminService';
import AdminController from '../controllers/adminController';

const router = Router();

const userRepository = new UserRepository();
const adminService = new AdminService(userRepository);
const adminController = new AdminController(adminService);

router.get('/users', adminController.getUsers.bind(adminController));

export default router;

