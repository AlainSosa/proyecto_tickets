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

export class Extension extends Model<
  InferAttributes<Extension>,
  InferCreationAttributes<Extension>
> {
  declare id: CreationOptional<number>;
  declare extensionNumber: string;
  declare ipAddress: CreationOptional<string | null>;
  declare phoneId: CreationOptional<ForeignKey<Asset['id']> | null>;
  declare assignedTo: CreationOptional<ForeignKey<User['id']> | null>;
  declare location: CreationOptional<string | null>;
  declare status: 'active' | 'inactive';
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;
}

Extension.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    extensionNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    phoneId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'assets', key: 'id' },
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
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
    modelName: 'Extension',
    tableName: 'extensions',
    paranoid: true,
  }
);
