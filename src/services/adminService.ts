import { UserMapper } from "../mappers/UserMapper";
import { UserDTO } from "../models/dto/UserDTO";
import UserRepository from "../repositories/UserRepository";
import UserDAO from "../models/dao/UserDAO";

interface IUserRepository {
  fetchAll(): Promise<UserDAO[]>;
}

class AdminService {
  constructor(private userRepository: IUserRepository = new UserRepository()) {}

  async getAllUsers(): Promise<UserDTO[]> {
    const users = await this.userRepository.fetchAll();
    return users.map(UserMapper.toDTO);
  }
}

export const adminService = new AdminService();
export default AdminService;
