import { Op } from 'sequelize';
import { Consumable } from '../database/models';
import { NotFoundError } from '../utils/errors';

interface CreateData {
  name: string;
  type: 'toner' | 'keyboard' | 'mouse' | 'cable' | 'adapter' | 'supplies' | 'other';
  stock: number;
  minStock?: number;
  entryDate?: string | null;
  observations?: string | null;
}

interface PaginationParams {
  page: number;
  limit: number;
  type?: string;
  status?: string;
  search?: string;
}

export class ConsumableService {
  async create(data: CreateData): Promise<Consumable> {
    const status = data.stock <= 0 ? 'out_of_stock' : data.stock <= (data.minStock || 1) ? 'low' : 'available';
    return Consumable.create({ ...data, status } as any);
  }

  async findAll(params: PaginationParams) {
    const { page, limit, type, status, search } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { observations: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Consumable.findAndCountAll({
      where,
      offset,
      limit,
      order: [['name', 'ASC']],
    });

    return { consumables: rows, total: count };
  }

  async findById(id: number): Promise<Consumable> {
    const item = await Consumable.findByPk(id);
    if (!item) throw new NotFoundError('Consumable');
    return item;
  }

  async update(id: number, data: Partial<CreateData>): Promise<Consumable> {
    const item = await Consumable.findByPk(id);
    if (!item) throw new NotFoundError('Consumable');

    const updateData: any = { ...data };
    if (data.stock !== undefined) {
      const minStock = data.minStock ?? item.minStock;
      updateData.status = data.stock <= 0 ? 'out_of_stock' : data.stock <= minStock ? 'low' : 'available';
    }

    await item.update(updateData);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const item = await Consumable.findByPk(id);
    if (!item) throw new NotFoundError('Consumable');
    await item.destroy();
  }
}
