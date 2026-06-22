import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  ForeignKey,
  BelongsToGetAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
} from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';
import { TicketComment } from './TicketComment';
import { TicketHistory } from './TicketHistory';

export type TicketStatus =
  | 'open'
  | 'pending_assignment'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'resolved'
  | 'closed'
  | 'canceled'
  | 'pending';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export class Ticket extends Model<InferAttributes<Ticket>, InferCreationAttributes<Ticket>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: string;
  declare status: TicketStatus;
  declare priority: CreationOptional<TicketPriority | null>;
  declare requestedBy: ForeignKey<User['id']>;
  declare assignedTo: CreationOptional<ForeignKey<User['id']> | null>;
  declare resolutionDate: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date>;

  declare requester: NonAttribute<User>;
  declare technician: NonAttribute<User | null>;
  declare comments: NonAttribute<TicketComment[]>;
  declare histories: NonAttribute<TicketHistory[]>;

  declare getRequester: BelongsToGetAssociationMixin<User>;
  declare getTechnician: BelongsToGetAssociationMixin<User>;
  declare getComments: HasManyGetAssociationsMixin<TicketComment>;
  declare createComment: HasManyCreateAssociationMixin<TicketComment>;
  declare getHistories: HasManyGetAssociationsMixin<TicketHistory>;
  declare createHistory: HasManyCreateAssociationMixin<TicketHistory>;
}

Ticket.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'pending_assignment', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'canceled', 'pending'),
      allowNull: false,
      defaultValue: 'pending_assignment',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: true,
    },
    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    resolutionDate: {
      type: DataTypes.DATE,
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
    modelName: 'Ticket',
    tableName: 'tickets',
    paranoid: true,
  }
);
