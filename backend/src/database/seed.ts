import bcrypt from 'bcryptjs';
import { sequelize } from './connection';
import { ensureDatabaseExists } from './ensureDatabase';
import { setupAssociations } from './models/associations';
import {
  Asset,
  AuditLog,
  Extension,
  Maintenance,
  NetworkPoint,
  Ticket,
  TicketComment,
  TicketHistory,
  User,
} from './models';
import { INSTITUTIONAL_AREAS, InstitutionalArea } from '../constants/institutionalAreas';

setupAssociations();

const demoPassword = 'Sistema2026';

const baseUsers = [
  {
    name: 'Administrador',
    email: 'admin@sistema.com',
    password: 'admin123',
    role: 'admin' as const,
    area: 'Administración' as InstitutionalArea,
  },
  {
    name: 'Usuario Final',
    email: 'usuario@sistema.com',
    password: 'usuario123',
    role: 'user' as const,
    area: 'Consulado' as InstitutionalArea,
  },
];

const demoUsers = [
  ['Ana Paula Ribeiro', 'ana.ribeiro@sistema.com', 'admin', 'Administración'],
  ['Carlos Eduardo Lima', 'carlos.lima@sistema.com', 'admin', 'Gabinete'],
  ['Marcos Vinicius Souza', 'marcos.souza@sistema.com', 'technician', 'CCOM'],
  ['Luciana Pereira Gomes', 'luciana.gomes@sistema.com', 'technician', 'CCOM'],
  ['Bruno Henrique Alves', 'bruno.alves@sistema.com', 'technician', 'CCOM'],
  ['Patricia Menezes Costa', 'patricia.costa@sistema.com', 'technician', 'Administración'],
  ['Ricardo Nascimento Silva', 'ricardo.silva@sistema.com', 'user', 'Consulado'],
  ['Fernanda Oliveira Martins', 'fernanda.martins@sistema.com', 'user', 'Consulado'],
  ['Juliana Rocha Campos', 'juliana.campos@sistema.com', 'user', 'Gabinete'],
  ['Roberto Almeida Torres', 'roberto.torres@sistema.com', 'user', 'Administración'],
  ['Vanessa Cristina Araujo', 'vanessa.araujo@sistema.com', 'user', 'Consulado'],
  ['Thiago Ferreira Lopes', 'thiago.lopes@sistema.com', 'user', 'Fusileros'],
  ['Camila Santos Vieira', 'camila.vieira@sistema.com', 'user', 'Residencia'],
  ['Diego Matheus Correia', 'diego.correia@sistema.com', 'user', 'CCOM'],
  ['Mariana Carvalho Pinto', 'mariana.pinto@sistema.com', 'user', 'Administración'],
  ['Joao Pedro Barbosa', 'joao.barbosa@sistema.com', 'user', 'Consulado'],
  ['Beatriz Helena Moreira', 'beatriz.moreira@sistema.com', 'user', 'Gabinete'],
  ['Rafael Augusto Teixeira', 'rafael.teixeira@sistema.com', 'user', 'Fusileros'],
  ['Larissa Monteiro Duarte', 'larissa.duarte@sistema.com', 'user', 'Residencia'],
  ['Felipe Andrade Melo', 'felipe.melo@sistema.com', 'user', 'Consulado'],
  ['Renata Cavalcante Dias', 'renata.dias@sistema.com', 'user', 'Administración'],
  ['Gustavo Henrique Nunes', 'gustavo.nunes@sistema.com', 'user', 'CCOM'],
  ['Aline Cristina Batista', 'aline.batista@sistema.com', 'user', 'Consulado'],
  ['Paulo Sergio Freitas', 'paulo.freitas@sistema.com', 'user', 'Gabinete'],
  ['Leticia Fernandes Moraes', 'leticia.moraes@sistema.com', 'user', 'Residencia'],
  ['Eduardo Ribeiro Cunha', 'eduardo.cunha@sistema.com', 'user', 'Fusileros'],
  ['Carolina Mendes Farias', 'carolina.farias@sistema.com', 'user', 'Consulado'],
  ['Andre Luiz Cardoso', 'andre.cardoso@sistema.com', 'user', 'Administración'],
  ['Sofia Martins Duarte', 'sofia.duarte@sistema.com', 'user', 'Consulado'],
  ['Henrique Costa Ramos', 'henrique.ramos@sistema.com', 'user', 'CCOM'],
] as const;

const ticketCases = [
  ['No enciende la computadora de atención', 'El equipo de ventanilla no inicia después de un corte eléctrico.', 'Hardware', 'Consulado', 'critical'],
  ['Correo institucional sin sincronizar', 'Outlook muestra error de credenciales y no descarga mensajes nuevos.', 'Correo electrónico', 'Gabinete', 'medium'],
  ['Impresora imprime con manchas', 'La impresora del área presenta manchas negras en documentos oficiales.', 'Impresoras', 'Administración', 'medium'],
  ['Punto de red sin conectividad', 'El cableado de la oficina no entrega conexión al equipo asignado.', 'Red', 'Consulado', 'high'],
  ['Solicitud de instalación de software', 'Se requiere instalar lector PDF y herramientas de firma digital.', 'Software', 'Administración', 'low'],
  ['Teléfono IP sin registro', 'El teléfono queda en estado registrando y no recibe llamadas internas.', 'Telefonía', 'CCOM', 'high'],
  ['Equipo lento al abrir expedientes', 'El usuario reporta lentitud al acceder a carpetas compartidas.', 'Rendimiento', 'Consulado', 'medium'],
  ['UPS emite alarma constante', 'El UPS del puesto de recepción emite sonido y requiere revisión.', 'Energía', 'Residencia', 'high'],
  ['Actualización de antivirus pendiente', 'La consola informa que el equipo tiene firmas desactualizadas.', 'Seguridad', 'Fusileros', 'medium'],
  ['Escáner no detectado', 'El sistema no reconoce el escáner usado para digitalizar documentos.', 'Periféricos', 'Consulado', 'medium'],
  ['Restablecimiento de contraseña', 'El usuario olvidó su contraseña del sistema interno.', 'Accesos', 'Gabinete', 'low'],
  ['Falla intermitente de WiFi', 'La red inalámbrica se desconecta varias veces durante la jornada.', 'Red', 'Residencia', 'high'],
] as const;

function daysAgo(days: number, hour = 9, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

async function createOrKeepUsers(): Promise<User[]> {
  for (const user of baseUsers) {
    await User.findOrCreate({
      where: { email: user.email },
      defaults: {
        name: user.name,
        email: user.email,
        password: await bcrypt.hash(user.password, 10),
        role: user.role,
        area: user.area,
        isActive: true,
      },
    });
  }

  const demoPasswordHash = await bcrypt.hash(demoPassword, 10);

  for (const [name, email, role, area] of demoUsers) {
    await User.findOrCreate({
      where: { email },
      defaults: {
        name,
        email,
        password: demoPasswordHash,
        role,
        area: area as InstitutionalArea,
        isActive: true,
      },
    });
  }

  return User.findAll({ order: [['id', 'ASC']] });
}

async function clearOperationalData(): Promise<void> {
  await TicketComment.destroy({ where: {}, force: true });
  await TicketHistory.destroy({ where: {}, force: true });
  await Maintenance.destroy({ where: {}, force: true });
  await Extension.destroy({ where: {}, force: true });
  await NetworkPoint.destroy({ where: {}, force: true });
  await AuditLog.destroy({ where: {}, force: true });
  await Ticket.destroy({ where: {}, force: true });
  await Asset.destroy({ where: {}, force: true });
  await User.destroy({ where: { email: 'tecnico@sistema.com' }, force: true });
}

async function seedAssets(users: User[]): Promise<Asset[]> {
  const assetModels = [
    ['computer', 'Dell', 'OptiPlex 7090'],
    ['laptop', 'Lenovo', 'ThinkPad E14'],
    ['printer', 'HP', 'LaserJet Pro M404'],
    ['ups', 'APC', 'Back-UPS 1500'],
    ['switch', 'Cisco', 'Catalyst 2960'],
    ['router', 'MikroTik', 'RB3011'],
    ['ip_phone', 'Yealink', 'T31P'],
    ['monitor', 'LG', '24MK430H'],
  ] as const;

  const demoUsersOnly = users.filter((user) => user.email !== 'admin@sistema.com');

  const assets = Array.from({ length: 42 }, (_, index) => {
    const [type, brand, model] = pick(assetModels, index);
    const createdAt = daysAgo(14 - (index % 14), 8 + (index % 7), 10);

    return {
      internalCode: `EQ-${String(index + 1).padStart(4, '0')}`,
      type,
      brand,
      model,
      serialNumber: `SN2026${String(5000 + index)}`,
      status: index % 17 === 0 ? 'maintenance' : index % 23 === 0 ? 'inactive' : 'active',
      location: pick(INSTITUTIONAL_AREAS, index),
      assignedTo: ['computer', 'laptop', 'ip_phone', 'monitor'].includes(type)
        ? pick(demoUsersOnly, index).id
        : null,
      acquisitionDate: daysAgo(120 + index, 0, 0),
      observations: index % 9 === 0 ? 'Equipo incluido en la prueba piloto institucional.' : null,
      createdAt,
      updatedAt: addHours(createdAt, 2),
    };
  });

  return Asset.bulkCreate(assets as any[], { returning: true });
}

async function seedInfrastructure(assets: Asset[], users: User[]): Promise<void> {
  const switches = assets.filter((asset) => asset.type === 'switch');
  const phones = assets.filter((asset) => asset.type === 'ip_phone');
  const assignableUsers = users.filter((user) => user.role !== 'admin');

  await NetworkPoint.bulkCreate(
    Array.from({ length: 28 }, (_, index) => {
      const createdAt = daysAgo(13 - (index % 14), 10, index % 50);

      return {
        label: `RED-${String(index + 1).padStart(3, '0')}`,
        location: pick(INSTITUTIONAL_AREAS, index + 2),
        patchPanel: `PP-${1 + (index % 3)}`,
        switchId: switches.length ? pick(switches, index).id : null,
        switchPort: `Gi0/${1 + (index % 24)}`,
        status: index % 12 === 0 ? 'faulty' : index % 10 === 0 ? 'inactive' : 'active',
        observations: index % 12 === 0 ? 'Se programó revisión por pérdida de señal.' : null,
        createdAt,
        updatedAt: addHours(createdAt, 1),
      };
    }) as any[]
  );

  await Extension.bulkCreate(
    Array.from({ length: 24 }, (_, index) => {
      const createdAt = daysAgo(12 - (index % 13), 11, index % 40);

      return {
        extensionNumber: String(200 + index),
        ipAddress: `192.168.20.${30 + index}`,
        phoneId: phones.length ? pick(phones, index).id : null,
        assignedTo: pick(assignableUsers, index).id,
        location: pick(INSTITUTIONAL_AREAS, index + 1),
        status: index % 11 === 0 ? 'inactive' : 'active',
        createdAt,
        updatedAt: addHours(createdAt, 1),
      };
    }) as any[]
  );
}

async function seedMaintenances(assets: Asset[], technicians: User[]): Promise<void> {
  await Maintenance.bulkCreate(
    Array.from({ length: 24 }, (_, index) => {
      const scheduledDate = daysAgo(14 - (index % 14), 0, 0);
      const wasPerformed = index % 5 !== 0;
      const createdAt = daysAgo(14 - (index % 14), 8, 30);

      return {
        assetId: pick(assets, index).id,
        type: index % 3 === 0 ? 'corrective' : 'preventive',
        scheduledDate,
        performedDate: wasPerformed ? addDays(scheduledDate, index % 2) : null,
        technicianId: pick(technicians, index).id,
        observations: wasPerformed
          ? 'Revisión realizada durante la prueba piloto. Equipo operativo.'
          : 'Mantenimiento pendiente de cierre para seguimiento.',
        nextMaintenanceDate: addDays(scheduledDate, 60 + (index % 30)),
        createdAt,
        updatedAt: addHours(createdAt, wasPerformed ? 6 : 1),
      };
    }) as any[]
  );
}

async function seedTickets(users: User[], technicians: User[], admin: User): Promise<Ticket[]> {
  const requesters = users.filter((user) => user.role === 'user');
  const statuses = ['pending', 'pending', 'in_progress', 'in_progress', 'resolved', 'resolved'] as const;
  const ticketsToCreate = Array.from({ length: 72 }, (_, index) => {
    const [title, description, category, location, priority] = pick(ticketCases, index);
    const createdAt = daysAgo(14 - (index % 14), 8 + (index % 9), (index * 7) % 60);
    const status = pick(statuses, index);
    const assignedTo = status === 'pending' && index % 4 === 0 ? null : pick(technicians, index).id;
    const resolutionDate = status === 'resolved' ? addHours(createdAt, 8 + (index % 24)) : null;

    return {
      title: `${title} #${String(index + 1).padStart(2, '0')}`,
      description,
      category,
      location,
      attachments: [],
      status,
      priority,
      requestedBy: pick(requesters, index).id,
      assignedTo,
      resolutionDate,
      createdAt,
      updatedAt: resolutionDate ?? addHours(createdAt, 2 + (index % 18)),
    };
  });

  const tickets = await Ticket.bulkCreate(ticketsToCreate as any[], { returning: true });

  const comments: any[] = [];
  const histories: any[] = [];
  const auditLogs: any[] = [];

  tickets.forEach((ticket, index) => {
    const requester = pick(requesters, index);
    const technician = ticket.assignedTo ? technicians.find((user) => user.id === ticket.assignedTo) ?? pick(technicians, index) : null;
    const createdAt = new Date(ticket.createdAt);
    const ticketStatus = ticket.getDataValue('status') as string;

    histories.push({
      ticketId: ticket.id,
      userId: requester.id,
      action: 'ticket_created',
      actorRole: 'user',
      field: 'status',
      oldValue: null,
      newValue: 'pending',
      previousStatus: null,
      newStatus: 'pending',
      assignedTechnicianId: null,
      priority: ticket.priority,
      comment: 'Solicitud registrada por el usuario durante la prueba piloto.',
      solution: null,
      createdAt,
    });

    if (technician) {
      const assignedAt = addHours(createdAt, 1);
      histories.push({
        ticketId: ticket.id,
        userId: admin.id,
        action: 'ticket_assigned',
        actorRole: 'admin',
        field: 'assignedTo',
        oldValue: null,
        newValue: technician.name,
        previousStatus: 'pending',
        newStatus: 'pending',
        assignedTechnicianId: technician.id,
        priority: ticket.priority,
        comment: 'Asignación realizada según disponibilidad del equipo técnico.',
        solution: null,
        createdAt: assignedAt,
      });

      comments.push({
        ticketId: ticket.id,
        userId: technician.id,
        comment: 'Se revisó el caso y se inició diagnóstico técnico.',
        createdAt: addHours(createdAt, 2),
        updatedAt: addHours(createdAt, 2),
      });
    }

    if (['in_progress', 'resolved'].includes(ticketStatus)) {
      histories.push({
        ticketId: ticket.id,
        userId: technician?.id ?? admin.id,
        action: 'status_updated',
        actorRole: technician ? 'technician' : 'admin',
        field: 'status',
        oldValue: 'pending',
        newValue: ticketStatus,
        previousStatus: 'pending',
        newStatus: ticketStatus,
        assignedTechnicianId: technician?.id ?? null,
        priority: ticket.priority,
        comment: 'Caso atendido dentro del flujo de prueba.',
        solution: null,
        createdAt: addHours(createdAt, 4),
      });
    }

    if (ticketStatus === 'resolved') {
      histories.push({
        ticketId: ticket.id,
        userId: technician?.id ?? admin.id,
        action: 'ticket_resolved',
        actorRole: technician ? 'technician' : 'admin',
        field: 'status',
        oldValue: 'in_progress',
        newValue: ticketStatus,
        previousStatus: 'in_progress',
        newStatus: ticketStatus,
        assignedTechnicianId: technician?.id ?? null,
        priority: ticket.priority,
        comment: 'Se completó la atención y se notificó al usuario.',
        solution: 'Se aplicó diagnóstico, corrección y verificación con el área solicitante.',
        createdAt: ticket.resolutionDate ?? addHours(createdAt, 8),
      });

      comments.push({
        ticketId: ticket.id,
        userId: requester.id,
        comment: 'Confirmo que el servicio quedó funcionando correctamente.',
        createdAt: addHours(createdAt, 9),
        updatedAt: addHours(createdAt, 9),
      });
    }

    auditLogs.push({
      userId: technician?.id ?? admin.id,
      action: 'Registro de atención',
      entity: 'Ticket',
      entityId: ticket.id,
      ipAddress: `192.168.10.${20 + (index % 80)}`,
      oldData: null,
      newData: {
        title: ticket.title,
        status: ticketStatus,
        priority: ticket.priority,
      },
      createdAt: addHours(createdAt, 1),
    });
  });

  await TicketHistory.bulkCreate(histories);
  await TicketComment.bulkCreate(comments);
  await AuditLog.bulkCreate(auditLogs);

  return tickets;
}

async function seed(): Promise<void> {
  try {
    console.log('Preparando datos ficticios para demostración...');
    await ensureDatabaseExists();
    await sequelize.authenticate();

    const users = await createOrKeepUsers();
    const admin = users.find((user) => user.email === 'admin@sistema.com') ?? users.find((user) => user.role === 'admin');
    const technicians = users.filter((user) => user.role === 'technician' && user.isActive);

    if (!admin || technicians.length === 0) {
      throw new Error('Se requiere al menos un administrador y un técnico activo para crear la demostración.');
    }

    await clearOperationalData();

    const freshUsers = await User.findAll({ order: [['id', 'ASC']] });
    const freshAdmin = freshUsers.find((user) => user.email === 'admin@sistema.com') ?? admin;
    const freshTechnicians = freshUsers.filter((user) => user.role === 'technician' && user.isActive);

    const assets = await seedAssets(freshUsers);
    await seedInfrastructure(assets, freshUsers);
    await seedMaintenances(assets, freshTechnicians);
    const tickets = await seedTickets(freshUsers, freshTechnicians, freshAdmin);

    console.log(`Usuarios conservados/creados: ${freshUsers.length}`);
    console.log(`Activos creados: ${assets.length}`);
    console.log(`Tickets creados: ${tickets.length}`);
    console.log(`Contraseña de usuarios ficticios nuevos: ${demoPassword}`);
    console.log('Datos ficticios listos para la presentación.');
    process.exit(0);
  } catch (error) {
    console.error('No se pudieron preparar los datos ficticios:', error);
    process.exit(1);
  }
}

seed();
