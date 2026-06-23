import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
} from 'sequelize';
import { sequelize } from '../connection';
import { Asset } from './Asset';
import { DEFAULT_INSTITUTIONAL_AREA } from '../../constants/institutionalAreas';

export class NetworkPoint extends Model<
  InferAttributes<NetworkPoint>,
  InferCreationAttributes<NetworkPoint>
> {
  declare id: CreationOptional<number>;
  declare label: string;
  declare location: string;
  declare patchPanel: CreationOptional<string | null>;
  declare switchId: CreationOptional<ForeignKey<Asset['id']> | null>;
  declare switchPort: CreationOptional<string | null>;
  declare status: 'active' | 'inactive' | 'faulty';
  declare observations: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;
}

NetworkPoint.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: DEFAULT_INSTITUTIONAL_AREA,
    },
    patchPanel: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    switchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'assets', key: 'id' },
    },
    switchPort: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'faulty'),
      allowNull: false,
      defaultValue: 'active',
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
    modelName: 'NetworkPoint',
    tableName: 'network_points',
    paranoid: true,
  }
);
