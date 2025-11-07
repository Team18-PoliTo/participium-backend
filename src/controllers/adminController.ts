import { Request, Response, NextFunction } from "express";
import AdminService from "../services/adminService";


class AdminController {
  constructor(private adminService: AdminService) {}

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.adminService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(400).json({error: error})
      next(error); 
    }
  }
 
  
}


export default AdminController;
