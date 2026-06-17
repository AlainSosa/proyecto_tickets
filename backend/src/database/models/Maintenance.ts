import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
} from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';
import { Asset } from './Asset';

export class Maintenance extends Model<
  InferAttributes<Maintenance>,
  InferCreationAttributes<Maintenance>
> {
  declare id: CreationOptional<number>;
  declare assetId: ForeignKey<Asset['id']>;
  declare type: 'preventive' | 'corrective';
  declare scheduledDate: CreationOptional<Date | null>;
  declare performedDate: CreationOptional<Date | null>;
  declare technicianId: ForeignKey<User['id']>;
  declare observations: CreationOptional<string | null>;
  declare nextMaintenanceDate: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;
}

Maintenance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    assetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'assets', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('preventive', 'corrective'),
      allowNull: false,
    },
    scheduledDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    performedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    technicianId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nextMaintenanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
    modelName: 'Maintenance',
    tableName: 'maintenances',
    paranoid: true,
  }
);
