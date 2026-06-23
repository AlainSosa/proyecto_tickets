import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';

export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User['id']>;
  declare action: string;
  declare entity: string;
  declare entityId: CreationOptional<number | null>;
  declare ipAddress: CreationOptional<string | null>;
  declare oldData: CreationOptional<Record<string, unknown> | null>;
  declare newData: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;

  declare user: NonAttribute<User>;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    action: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    entity: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'entity_id',
    },
    ipAddress: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'ip_address',
    },
    oldData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'old_data',
    },
    newData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'new_data',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: false,
  }
);
