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

export class TicketComment extends Model<
  InferAttributes<TicketComment>,
  InferCreationAttributes<TicketComment>
> {
  declare id: CreationOptional<number>;
  declare ticketId: ForeignKey<Ticket['id']>;
  declare userId: ForeignKey<User['id']>;
  declare comment: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TicketComment.init(
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
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'TicketComment',
    tableName: 'ticket_comments',
  }
);
