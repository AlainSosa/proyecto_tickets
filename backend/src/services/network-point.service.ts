import { Op } from 'sequelize';
import { NetworkPoint, Asset } from '../database/models';
import { NotFoundError } from '../utils/errors';
import { InstitutionalArea } from '../constants/institutionalAreas';

interface CreateData {
  label: string;
  location: InstitutionalArea;
  patchPanel?: string | null;
  switchId?: number | null;
  switchPort?: string | null;
  status?: 'active' | 'inactive' | 'faulty';
  observations?: string | null;
}

interface PaginationParams {
  page: number;
  limit: number;
  status?: string;
  location?: InstitutionalArea;
  search?: string;
}

export class NetworkPointService {
  async create(data: CreateData): Promise<NetworkPoint> {
    return NetworkPoint.create(data as any);
  }

  async findAll(params: PaginationParams) {
    const { page, limit, status, location, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (location) where.location = location;
    if (search) {
      where[Op.or] = [
        { label: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await NetworkPoint.findAndCountAll({
      where,
      offset,
      limit,
      include: [{ model: Asset, as: 'switch', attributes: ['id', 'internalCode', 'brand', 'model'] }],
      order: [['label', 'ASC']],
    });

    return { points: rows, total: count };
  }

  async findById(id: number): Promise<NetworkPoint> {
    const point = await NetworkPoint.findByPk(id, {
      include: [{ model: Asset, as: 'switch', attributes: ['id', 'internalCode', 'brand', 'model'] }],
    });
    if (!point) throw new NotFoundError('Punto de red');
    return point;
  }

  async update(id: number, data: Partial<CreateData>): Promise<NetworkPoint> {
    const point = await NetworkPoint.findByPk(id);
    if (!point) throw new NotFoundError('Punto de red');
    await point.update(data);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const point = await NetworkPoint.findByPk(id);
    if (!point) throw new NotFoundError('Punto de red');
    await point.destroy();
  }
}
