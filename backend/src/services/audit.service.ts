import { Op } from 'sequelize';
import { AuditLog, User } from '../database/models';

interface AuditQuery {
  page: number;
  limit: number;
  action?: string;
  entity?: string;
  userId?: number;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class AuditService {
  async findAll(params: AuditQuery) {
    const { page, limit, action, entity, userId, search, dateFrom, dateTo } = params;
    const where: any = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (dateFrom && dateTo) where.createdAt = { [Op.gte]: dateFrom, [Op.lt]: dateTo };
    if (search) {
      where[Op.or] = [
        { action: { [Op.iLike]: `%${search}%` } },
        { entity: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit,
    });

    return { auditLogs: rows, total: count };
  }
}
