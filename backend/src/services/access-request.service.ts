import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { AccessRequest, User } from '../database/models';
import { NotFoundError, ConflictError } from '../utils/errors';
import { InstitutionalArea } from '../constants/institutionalAreas';

interface CreateAccessRequestData {
  name: string;
  email: string;
  area: InstitutionalArea;
  phone?: string;
  message?: string;
}

interface FindAllParams {
  page: number;
  limit: number;
  status?: 'pending' | 'approved' | 'rejected';
}

export class AccessRequestService {
  async create(data: CreateAccessRequestData): Promise<AccessRequest> {
    const existing = await AccessRequest.findOne({
      where: {
        email: data.email,
        status: 'pending',
      },
    });

    if (existing) {
      throw new ConflictError('Ya existe una solicitud de acceso pendiente para este correo');
    }

    return AccessRequest.create({
      name: data.name,
      email: data.email,
      area: data.area,
      phone: data.phone || null,
      message: data.message || null,
      status: 'pending',
    });
  }

  async findAll(params: FindAllParams) {
    const { page, limit, status } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const { rows, count } = await AccessRequest.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    return { requests: rows, total: count };
  }

  async approve(id: number, password: string): Promise<{ request: AccessRequest; user: Partial<User> }> {
    const request = await AccessRequest.findByPk(id);
    if (!request) throw new NotFoundError('Solicitud de acceso');

    if (request.status === 'approved') {
      throw new ConflictError('La solicitud ya fue aprobada');
    }

    const existingUser = await User.findOne({ where: { email: request.email } });
    if (existingUser) {
      throw new ConflictError('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: request.name,
      email: request.email,
      password: passwordHash,
      role: 'user',
      area: request.area,
      isActive: true,
    });

    await request.update({ status: 'approved' });

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return { request, user: userWithoutPassword };
  }

  async reject(id: number): Promise<AccessRequest> {
    const request = await AccessRequest.findByPk(id);
    if (!request) throw new NotFoundError('Solicitud de acceso');

    if (request.status === 'approved') {
      throw new ConflictError('No se puede rechazar una solicitud ya aprobada');
    }

    await request.update({ status: 'rejected' });
    return request;
  }
}