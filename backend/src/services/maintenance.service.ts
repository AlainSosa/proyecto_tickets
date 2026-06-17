import { Op } from 'sequelize';
import { Maintenance, Asset, User } from '../database/models';
import { NotFoundError } from '../utils/errors';

interface CreateData {
  assetId: number;
  type: 'preventive' | 'corrective';
  scheduledDate?: string | null;
  performedDate?: string | null;
  technicianId: number;
  observations?: string | null;
  nextMaintenanceDate?: string | null;
}

interface PaginationParams {
  page: number;
  limit: number;
  type?: string;
  search?: string;
}

export class MaintenanceService {
  async create(data: CreateData): Promise<Maintenance> {
    return Maintenance.create(data as any);
  }

  async findAll(params: PaginationParams) {
    const { page, limit, type, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { observations: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Maintenance.findAndCountAll({
      where,
      offset,
      limit,
      include: [
        { model: Asset, attributes: ['id', 'internalCode', 'brand', 'model', 'type'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return { maintenances: rows, total: count };
  }

  async findById(id: number): Promise<Maintenance> {
    const item = await Maintenance.findByPk(id, {
      include: [
        { model: Asset, attributes: ['id', 'internalCode', 'brand', 'model', 'type'] },
        { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!item) throw new NotFoundError('Maintenance record');
    return item;
  }

  async update(id: number, data: Partial<CreateData>): Promise<Maintenance> {
    const item = await Maintenance.findByPk(id);
    if (!item) throw new NotFoundError('Maintenance record');
    await item.update(data as any);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const item = await Maintenance.findByPk(id);
    if (!item) throw new NotFoundError('Maintenance record');
    await item.destroy();
  }

  async getDashboardStats() {
    const pending = await Maintenance.count({ where: { performedDate: null } });
    const completed = await Maintenance.count({ where: { performedDate: { [Op.ne]: null } } });
    const overdue = await Maintenance.count({
      where: {
        performedDate: null,
        scheduledDate: { [Op.lt]: new Date().toISOString().split('T')[0] },
      },
    });

    return { pending, completed, overdue };
  }
}
