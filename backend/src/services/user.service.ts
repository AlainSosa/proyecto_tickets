import { literal, Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { User } from '../database/models';
import { NotFoundError, ConflictError } from '../utils/errors';
import { InstitutionalArea } from '../constants/institutionalAreas';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'technician' | 'user';
  area: InstitutionalArea;
}

interface PaginationParams {
  page: number;
  limit: number;
  role?: string;
  area?: InstitutionalArea;
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
    const { page, limit, role, area, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (area) where.area = area;
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
      order: [
        [literal(`CASE "User"."role" WHEN 'admin' THEN 1 WHEN 'technician' THEN 2 WHEN 'user' THEN 3 ELSE 4 END`), 'ASC'],
        ['name', 'ASC'],
      ] as any,
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
