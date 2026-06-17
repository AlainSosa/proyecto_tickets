import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../connection';

export class Consumable extends Model<
  InferAttributes<Consumable>,
  InferCreationAttributes<Consumable>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare type:
    | 'toner'
    | 'keyboard'
    | 'mouse'
    | 'cable'
    | 'adapter'
    | 'supplies'
    | 'other';
  declare stock: number;
  declare minStock: CreationOptional<number>;
  declare status: 'available' | 'low' | 'out_of_stock';
  declare entryDate: CreationOptional<Date>;
  declare observations: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;
}

Consumable.init(
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
    type: {
      type: DataTypes.ENUM('toner', 'keyboard', 'mouse', 'cable', 'adapter', 'supplies', 'other'),
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.ENUM('available', 'low', 'out_of_stock'),
      allowNull: false,
      defaultValue: 'available',
    },
    entryDate: {
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
    modelName: 'Consumable',
    tableName: 'consumables',
    paranoid: true,
  }
);
