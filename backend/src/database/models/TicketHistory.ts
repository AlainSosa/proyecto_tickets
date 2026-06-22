import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
} from 'sequelize';
import { sequelize } from '../connection';
import { Ticket } from './Ticket';
import { User } from './User';

export type TicketHistoryAction =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'priority_defined'
  | 'status_updated'
  | 'comment_added'
  | 'diagnosis_registered'
  | 'solution_registered'
  | 'ticket_resolved'
  | 'ticket_closed'
  | 'ticket_reassigned'
  | 'follow_up_added';

export class TicketHistory extends Model<
  InferAttributes<TicketHistory>,
  InferCreationAttributes<TicketHistory>
> {
  declare id: CreationOptional<number>;
  declare ticketId: ForeignKey<Ticket['id']>;
  declare userId: ForeignKey<User['id']>;
  declare action: CreationOptional<TicketHistoryAction | null>;
  declare actorRole: CreationOptional<'admin' | 'technician' | 'user' | null>;
  declare field: string;
  declare oldValue: CreationOptional<string | null>;
  declare newValue: string;
  declare previousStatus: CreationOptional<string | null>;
  declare newStatus: CreationOptional<string | null>;
  declare assignedTechnicianId: CreationOptional<number | null>;
  declare priority: CreationOptional<string | null>;
  declare comment: CreationOptional<string | null>;
  declare solution: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
}

TicketHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'tickets', key: 'id' },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'actor_role',
    },
    field: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    oldValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    newValue: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    previousStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'previous_status',
    },
    newStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'new_status',
    },
    assignedTechnicianId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assigned_technician_id',
      references: { model: 'users', key: 'id' },
    },
    priority: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    solution: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'TicketHistory',
    tableName: 'ticket_histories',
    timestamps: false,
  }
);
