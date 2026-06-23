import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
} from 'sequelize';
import { sequelize } from '../connection';
import { Ticket } from './Ticket';
import { Asset } from './Asset';
import { Maintenance } from './Maintenance';
import { DEFAULT_INSTITUTIONAL_AREA, InstitutionalArea } from '../../constants/institutionalAreas';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: 'admin' | 'technician' | 'user';
  declare area: InstitutionalArea;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;

  declare tickets: NonAttribute<Ticket[]>;
  declare assignedTickets: NonAttribute<Ticket[]>;
  declare assets: NonAttribute<Asset[]>;
  declare maintenances: NonAttribute<Maintenance[]>;

  declare getTickets: HasManyGetAssociationsMixin<Ticket>;
  declare createTicket: HasManyCreateAssociationMixin<Ticket>;
}

User.init(
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
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'technician', 'user'),
      allowNull: false,
      defaultValue: 'user',
    },
    area: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: DEFAULT_INSTITUTIONAL_AREA,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    modelName: 'User',
    tableName: 'users',
    paranoid: true,
  }
);
