import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
  BelongsToGetAssociationMixin,
} from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';

export class Asset extends Model<InferAttributes<Asset>, InferCreationAttributes<Asset>> {
  declare id: CreationOptional<number>;
  declare internalCode: string;
  declare type:
    | 'computer'
    | 'laptop'
    | 'printer'
    | 'ups'
    | 'switch'
    | 'router'
    | 'ip_phone'
    | 'monitor'
    | 'other';
  declare brand: string;
  declare model: string;
  declare serialNumber: string;
  declare status: 'active' | 'inactive' | 'maintenance' | 'disposed';
  declare location: CreationOptional<string | null>;
  declare assignedTo: CreationOptional<ForeignKey<User['id']> | null>;
  declare acquisitionDate: CreationOptional<Date | null>;
  declare observations: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;

  declare assignedUser: NonAttribute<User | null>;
  declare getAssignedUser: BelongsToGetAssociationMixin<User>;
}

Asset.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    internalCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM(
        'computer',
        'laptop',
        'printer',
        'ups',
        'switch',
        'router',
        'ip_phone',
        'monitor',
        'other'
      ),
      allowNull: false,
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    serialNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'disposed'),
      allowNull: false,
      defaultValue: 'active',
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    acquisitionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    observations: {
      type: DataTypes.TEXT,
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
    modelName: 'Asset',
    tableName: 'assets',
    paranoid: true,
  }
);
