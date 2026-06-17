import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { User } from '../database/models';
import { NotFoundError, ConflictError } from '../utils/errors';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'technician' | 'user';
}

interface PaginationParams {
  page: number;
  limit: number;
  role?: string;
  search?: string;
}

export class UserService {
  async create(data: CreateUserData): Promise<Partial<User>> {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({ ...data, password: passwordHash });

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async findAll(params: PaginationParams) {
    const { page, limit, role, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      offset,
      limit,
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']],
    });

    return { users: rows, total: count };
  }

  async findById(id: number): Promise<Partial<User>> {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async update(id: number, data: Partial<CreateUserData>): Promise<Partial<User>> {
    const user = await User.findByPk(id);
    if (!user) throw new NotFoundError('User');

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await user.update(updateData);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const user = await User.findByPk(id);
    if (!user) throw new NotFoundError('User');
    await user.destroy();
  }
}
