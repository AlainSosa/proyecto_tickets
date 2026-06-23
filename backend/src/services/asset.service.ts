import { Op } from 'sequelize';
import { Asset, User } from '../database/models';
import { NotFoundError } from '../utils/errors';
import { InstitutionalArea } from '../constants/institutionalAreas';

interface CreateAssetData {
  internalCode: string;
  type: AssetType;
  brand: string;
  model: string;
  serialNumber: string;
  status?: AssetStatus;
  location?: InstitutionalArea | null;
  assignedTo?: number | null;
  acquisitionDate?: string | null;
  observations?: string | null;
}

type AssetType = 'computer' | 'laptop' | 'printer' | 'ups' | 'switch' | 'router' | 'ip_phone' | 'monitor' | 'other';
type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'disposed';

interface PaginationParams {
  page: number;
  limit: number;
  type?: string;
  status?: string;
  location?: InstitutionalArea;
  search?: string;
}

export class AssetService {
  async create(data: CreateAssetData): Promise<Asset> {
    return Asset.create(data as any);
  }

  async findAll(params: PaginationParams) {
    const { page, limit, type, status, location, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (location) where.location = location;
    if (search) {
      where[Op.or] = [
        { internalCode: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Asset.findAndCountAll({
      where,
      offset,
      limit,
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return { assets: rows, total: count };
  }

  async findById(id: number): Promise<Asset> {
    const asset = await Asset.findByPk(id, {
      include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] }],
    });
    if (!asset) throw new NotFoundError('Asset');
    return asset;
  }

  async update(id: number, data: Partial<CreateAssetData>): Promise<Asset> {
    const asset = await Asset.findByPk(id);
    if (!asset) throw new NotFoundError('Asset');
    await asset.update(data as any);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const asset = await Asset.findByPk(id);
    if (!asset) throw new NotFoundError('Asset');
    await asset.destroy();
  }

  async getDashboardStats() {
    const total = await Asset.count();
    const active = await Asset.count({ where: { status: 'active' } });
    const inMaintenance = await Asset.count({ where: { status: 'maintenance' } });
    const disposed = await Asset.count({ where: { status: 'disposed' } });

    const byType = {
      computers: await Asset.count({ where: { type: { [Op.in]: ['computer', 'laptop'] }, status: 'active' } }),
      printers: await Asset.count({ where: { type: 'printer', status: 'active' } }),
      network: await Asset.count({ where: { type: { [Op.in]: ['switch', 'router'] }, status: 'active' } }),
      others: await Asset.count({ where: { type: { [Op.notIn]: ['computer', 'laptop', 'printer', 'switch', 'router'] }, status: 'active' } }),
    };

    return { total, active, inMaintenance, disposed, byType };
  }
}
