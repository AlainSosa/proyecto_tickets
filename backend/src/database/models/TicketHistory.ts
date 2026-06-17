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

export class TicketHistory extends Model<
  InferAttributes<TicketHistory>,
  InferCreationAttributes<TicketHistory>
> {
  declare id: CreationOptional<number>;
  declare ticketId: ForeignKey<Ticket['id']>;
  declare userId: ForeignKey<User['id']>;
  declare field: string;
  declare oldValue: CreationOptional<string | null>;
  declare newValue: string;
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
