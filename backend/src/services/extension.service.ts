import { Op } from 'sequelize';
import { Extension, User, Asset } from '../database/models';
import { NotFoundError } from '../utils/errors';
import { InstitutionalArea } from '../constants/institutionalAreas';

interface CreateData {
  extensionNumber: string;
  ipAddress?: string | null;
  phoneId?: number | null;
  assignedTo?: number | null;
  location?: InstitutionalArea | null;
  status?: 'active' | 'inactive';
}

interface PaginationParams {
  page: number;
  limit: number;
  status?: string;
  location?: InstitutionalArea;
  search?: string;
}

export class ExtensionService {
  async create(data: CreateData): Promise<Extension> {
    return Extension.create(data as any);
  }

  async findAll(params: PaginationParams) {
    const { page, limit, status, location, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (location) where.location = location;
    if (search) {
      where[Op.or] = [
        { extensionNumber: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Extension.findAndCountAll({
      where,
      offset,
      limit,
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] },
        { model: Asset, as: 'phone', attributes: ['id', 'internalCode', 'brand', 'model'] },
      ],
      order: [['extensionNumber', 'ASC']],
    });

    return { extensions: rows, total: count };
  }

  async findById(id: number): Promise<Extension> {
    const ext = await Extension.findByPk(id, {
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] },
        { model: Asset, as: 'phone', attributes: ['id', 'internalCode', 'brand', 'model'] },
      ],
    });
    if (!ext) throw new NotFoundError('Extensión');
    return ext;
  }

  async update(id: number, data: Partial<CreateData>): Promise<Extension> {
    const ext = await Extension.findByPk(id);
    if (!ext) throw new NotFoundError('Extensión');
    await ext.update(data);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const ext = await Extension.findByPk(id);
    if (!ext) throw new NotFoundError('Extensión');
    await ext.destroy();
  }
}
