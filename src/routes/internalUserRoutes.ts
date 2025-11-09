import { Router } from 'express';
import InternalUserController from '../controllers/InternalUserController';
import InternalUserService from '../services/internalUserService';
import InternalUserRepository from '../repositories/InternalUserRepository';
import RoleRepository from '../repositories/RoleRepository';
import RoleService from '../services/RoleService';
import RoleController from '../controllers/RoleController';

const router = Router();

// Dependency Injection Setup
const internalUserRepository = new InternalUserRepository();
const internalUserService = new InternalUserService(internalUserRepository);
const internalUserController = new InternalUserController(internalUserService);

const roleRepository = new RoleRepository();
const roleService = new RoleService(roleRepository);
const roleController = new RoleController(roleService);


//GET /users - GET all internalUsers
router.get('/users',internalUserController.fetch.bind(internalUserController));

// POST /register - Register a new internalUser
router.post('/addEmployee', internalUserController.create.bind(internalUserController));

// PUT /updateEmployee/:id
router.put('/updateEmployee/:id', internalUserController.update.bind(internalUserController));


//GET /role - GET all roles
router.get('/roles', roleController.getAll.bind(roleController));

export default router;
