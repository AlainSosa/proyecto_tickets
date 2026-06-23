import { Op } from 'sequelize';
import { Asset, Extension, NetworkPoint, Ticket, User } from './models';
import { DEFAULT_INSTITUTIONAL_AREA, INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';

const allowedAreas = [...INSTITUTIONAL_AREAS];

export async function normalizeInstitutionalAreas(): Promise<void> {
  await Promise.all([
    Ticket.update(
      { location: DEFAULT_INSTITUTIONAL_AREA },
      { where: { [Op.or]: [{ location: null }, { location: '' }, { location: { [Op.notIn]: allowedAreas } }] } as any }
    ),
    Asset.update(
      { location: DEFAULT_INSTITUTIONAL_AREA },
      { where: { [Op.or]: [{ location: null }, { location: '' }, { location: { [Op.notIn]: allowedAreas } }] } as any }
    ),
    NetworkPoint.update(
      { location: DEFAULT_INSTITUTIONAL_AREA },
      { where: { [Op.or]: [{ location: null }, { location: '' }, { location: { [Op.notIn]: allowedAreas } }] } as any }
    ),
    Extension.update(
      { location: DEFAULT_INSTITUTIONAL_AREA },
      { where: { [Op.or]: [{ location: null }, { location: '' }, { location: { [Op.notIn]: allowedAreas } }] } as any }
    ),
    User.update(
      { area: DEFAULT_INSTITUTIONAL_AREA },
      { where: { [Op.or]: [{ area: null }, { area: '' }, { area: { [Op.notIn]: allowedAreas } }] } as any }
    ),
  ]);
}
