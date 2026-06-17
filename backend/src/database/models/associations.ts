import { User } from './User';
import { Ticket } from './Ticket';
import { TicketComment } from './TicketComment';
import { TicketHistory } from './TicketHistory';
import { Asset } from './Asset';
import { NetworkPoint } from './NetworkPoint';
import { Extension } from './Extension';
import { Consumable } from './Consumable';
import { Maintenance } from './Maintenance';

export function setupAssociations(): void {
  User.hasMany(Ticket, { foreignKey: 'requestedBy', as: 'requestedTickets' });
  User.hasMany(Ticket, { foreignKey: 'assignedTo', as: 'assignedTickets' });
  Ticket.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
  Ticket.belongsTo(User, { foreignKey: 'assignedTo', as: 'technician' });

  Ticket.hasMany(TicketComment, { foreignKey: 'ticketId', as: 'comments' });
  TicketComment.belongsTo(Ticket, { foreignKey: 'ticketId' });
  TicketComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

  Ticket.hasMany(TicketHistory, { foreignKey: 'ticketId', as: 'histories' });
  TicketHistory.belongsTo(Ticket, { foreignKey: 'ticketId' });
  TicketHistory.belongsTo(User, { foreignKey: 'userId', as: 'author' });

  User.hasMany(Asset, { foreignKey: 'assignedTo', as: 'assets' });
  Asset.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });

  Asset.hasMany(NetworkPoint, { foreignKey: 'switchId', as: 'networkPoints' });
  NetworkPoint.belongsTo(Asset, { foreignKey: 'switchId', as: 'switch' });

  Asset.hasMany(Extension, { foreignKey: 'phoneId', as: 'extensions' });
  Extension.belongsTo(Asset, { foreignKey: 'phoneId', as: 'phone' });
  User.hasMany(Extension, { foreignKey: 'assignedTo', as: 'extensions' });
  Extension.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });

  Asset.hasMany(Maintenance, { foreignKey: 'assetId', as: 'maintenances' });
  Maintenance.belongsTo(Asset, { foreignKey: 'assetId' });
  User.hasMany(Maintenance, { foreignKey: 'technicianId', as: 'maintenances' });
  Maintenance.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });
}
