import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../connection';
import { DEFAULT_INSTITUTIONAL_AREA, InstitutionalArea } from '../../constants/institutionalAreas';

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export class AccessRequest extends Model<
  InferAttributes<AccessRequest>,
  InferCreationAttributes<AccessRequest>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare email: string;
  declare area: InstitutionalArea;
  declare phone: CreationOptional<string | null>;
  declare message: CreationOptional<string | null>;
  declare status: AccessRequestStatus;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;
}

AccessRequest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    area: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: DEFAULT_INSTITUTIONAL_AREA,
    },
    phone: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    modelName: 'AccessRequest',
    tableName: 'access_requests',
    paranoid: true,
  }
);