import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
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

type Role = 'admin' | 'technician' | 'user';
type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'disposed';

interface StaffSeed {
  name: string;
  email: string;
  role: Role;
  area: InstitutionalArea;
  interno: number;
  password: string;
}

const staffSeeds: StaffSeed[] = [
  { name: 'Luis Henrique Sobreira', email: 'luis.sobreira@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 401, password: 'luis123' },
  { name: 'Trinidad Gómez', email: 'trinidad.gomez@itamaraty.gov.br', role: 'admin', area: 'Administración', interno: 402, password: 'trinidad123' },
  { name: 'Alain Sosa', email: 'alain.sosa@itamaraty.gov.br', role: 'technician', area: 'CCOM', interno: 403, password: 'alain123' },
  { name: 'Rafael Llanos', email: 'rafael.llanos@itamaraty.gov.br', role: 'technician', area: 'CCOM', interno: 404, password: 'rafael123' },
  { name: 'Raul Ramos', email: 'raul.ramos@itamaraty.gov.br', role: 'user', area: 'Administración', interno: 405, password: 'raul123' },
  { name: 'Marco Cortez', email: 'marco.cortez@itamaraty.gov.br', role: 'user', area: 'Administración', interno: 406, password: 'marco123' },
  { name: 'Giovana Zegarra', email: 'giovana.zegarra@itamaraty.gov.br', role: 'user', area: 'Administración', interno: 407, password: 'giovana123' },
  { name: 'Perla María', email: 'perla.maria@itamaraty.gov.br', role: 'user', area: 'Administración', interno: 408, password: 'perla123' },
  { name: 'Sara Tedesqui', email: 'sara.tedesqui@itamaraty.gov.br', role: 'user', area: 'Administración', interno: 409, password: 'sara123' },
  { name: 'Neidel Mol', email: 'neidel.mol@itamaraty.gov.br', role: 'user', area: 'Administración', interno: 410, password: 'neidel123' },
  { name: 'Wilson Chávez', email: 'wilson.chavez@itamaraty.gov.br', role: 'user', area: 'Administración', interno: 411, password: 'wilson123' },
  { name: 'Claudia Bruckner', email: 'claudia.bruckner@itamaraty.gov.br', role: 'user', area: 'Consulado', interno: 412, password: 'claudia123' },
  { name: 'Beymar Duchen', email: 'beymar.duchen@itamaraty.gov.br', role: 'user', area: 'Consulado', interno: 413, password: 'beymar123' },
  { name: 'Ana María de Salinas', email: 'ana.salinas@itamaraty.gov.br', role: 'user', area: 'Consulado', interno: 414, password: 'ana123' },
  { name: 'Caio de Oliveira', email: 'caio.oliveira@itamaraty.gov.br', role: 'user', area: 'Consulado', interno: 415, password: 'caio123' },
  { name: 'Sandra Ortuño', email: 'sandra.ortuno@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 416, password: 'sandra123' },
  { name: 'Cris Saavedra', email: 'cris.saavedra@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 417, password: 'cris123' },
  { name: 'Andre Rypl', email: 'andre.rypl@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 418, password: 'andre123' },
  { name: 'Felipe Maritingue', email: 'felipe.maritingue@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 419, password: 'felipe123' },
  { name: 'Eduardo Souza', email: 'eduardo.souza@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 420, password: 'eduardo123' },
  { name: 'Claudia Marañón', email: 'claudia.maranon@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 421, password: 'claudia123' },
  { name: 'Viviana Rodríguez', email: 'viviana.rodriguez@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 422, password: 'viviana123' },
  { name: 'Thiago Siscar', email: 'thiago.siscar@itamaraty.gov.br', role: 'user', area: 'Gabinete', interno: 423, password: 'thiago123' },
  { name: 'Diego Monteiro Farias', email: 'diego.farias@itamaraty.gov.br', role: 'user', area: 'Fusileros', interno: 424, password: 'diego123' },
  { name: 'Jefferson da Silva Nascimento', email: 'jefferson.nascimento@itamaraty.gov.br', role: 'user', area: 'Fusileros', interno: 425, password: 'jefferson123' },
  { name: 'Lucas Cavalcante de Lima', email: 'lucas.lima@itamaraty.gov.br', role: 'user', area: 'Fusileros', interno: 426, password: 'lucas123' },
  { name: 'Anderson Pereira dos Santos', email: 'anderson.santos@itamaraty.gov.br', role: 'user', area: 'Fusileros', interno: 427, password: 'anderson123' },
  { name: 'Paulo Roberto Guedes', email: 'paulo.guedes@itamaraty.gov.br', role: 'user', area: 'Fusileros', interno: 428, password: 'paulo123' },
];

const baseAdmin = {
  name: 'Administrador',
  email: 'admin@sistema.com',
  password: 'admin123',
  role: 'admin' as const,
  area: 'Administración' as InstitutionalArea,
};

const ASSETS: Array<{
  type: Asset['type'];
  brand: string;
  model: string;
  count: number;
  startIndex: number;
  status?: AssetStatus;
  area?: InstitutionalArea;
  note?: string;
}> = [
  { type: 'computer', brand: 'Dell', model: 'OptiPlex 7090', count: 10, startIndex: 1 },
  { type: 'computer', brand: 'Lenovo', model: 'ThinkCentre M70q', count: 8, startIndex: 11 },
  { type: 'computer', brand: 'HP', model: 'ProDesk 400 G7', count: 7, startIndex: 19 },
  { type: 'laptop', brand: 'Lenovo', model: 'ThinkPad E14', count: 2, startIndex: 26 },
  { type: 'printer', brand: 'HP', model: 'LaserJet Pro M404dn', count: 10, startIndex: 28 },
  { type: 'printer', brand: 'Brother', model: 'HL-L5210DN', count: 7, startIndex: 38 },
  { type: 'printer', brand: 'HP', model: 'LaserJet MFP M428fdw', count: 4, startIndex: 45 },
  { type: 'switch', brand: 'Cisco', model: 'Catalyst 2960-X', count: 3, startIndex: 49 },
  { type: 'router', brand: 'Cisco', model: 'ISR 4221', count: 1, startIndex: 52 },
  { type: 'other', brand: 'Epson', model: 'EB-X49 (data show)', count: 1, startIndex: 53 },
  { type: 'ups', brand: 'APC', model: 'Back-UPS 1500VA', count: 5, startIndex: 54 },
];

const PRINTER_CODES = Array.from({ length: 21 }, (_, i) => `PRB${String(28 + i).padStart(3, '0')}`);

const COMPUTER_CODES = Array.from({ length: 25 }, (_, i) => `PRB${String(1 + i).padStart(3, '0')}`);

function serialFor(brand: string, index: number): string {
  const base = (index * 7919 + index * index * 13 + 1234) % 90_000_000;
  if (brand === 'Dell') return `CN3${String(base).padStart(8, '0')}`;
  if (brand === 'Lenovo') return `PF2K${String(base).padStart(7, '0')}`;
  if (brand === 'HP') return `CND7${String(base).padStart(7, '0')}`;
  if (brand === 'Brother') return `U65${String(base).padStart(7, '0')}`;
  if (brand === 'Cisco') return `FCW${String(base).padStart(8, '0')}`;
  if (brand === 'Epson') return `X3FY${String(base).padStart(6, '0')}`;
  if (brand === 'APC') return `3B${String(base).padStart(9, '0')}`;
  return `SN${String(base).padStart(9, '0')}`;
}

async function createOrKeepUsers(): Promise<User[]> {
  await User.findOrCreate({
    where: { email: baseAdmin.email },
    defaults: {
      ...baseAdmin,
      password: await bcrypt.hash(baseAdmin.password, 10),
      isActive: true,
    },
  });

  for (const seed of staffSeeds) {
    await User.findOrCreate({
      where: { email: seed.email },
      defaults: {
        name: seed.name,
        email: seed.email,
        password: await bcrypt.hash(seed.password, 10),
        role: seed.role,
        area: seed.area,
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
  await User.destroy({ where: { email: { [Op.ne]: baseAdmin.email } }, force: true });
}

function dateOnly(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isWorkday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function workdaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  while (current <= end) {
    if (isWorkday(current)) days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function atTime(date: Date, hour: number, minute: number): Date {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function domainOf(area: InstitutionalArea): string {
  const map: Record<InstitutionalArea, string> = {
    Gabinete: '192.168.10',
    Consulado: '192.168.20',
    Administración: '192.168.30',
    CCOM: '192.168.40',
    Fusileros: '192.168.50',
    Residencia: '192.168.60',
  };
  return map[area] || '192.168.40';
}

interface CaseTemplate {
  cat: string;
  title: (codes: string[], area: string, ext?: string) => string;
  desc: (codes: string[], area: string, ext?: string) => string;
  prio: Ticket['priority'];
  resolveHours: number;
}

const CASE_TEMPLATES: CaseTemplate[] = [
  { cat: 'Impresoras', title: () => 'La impresora no imprime documentos', desc: (c, area) => `La impresora del área ${area} no imprime los documentos enviados desde la red; se percibe error de tono/atasco.`, prio: 'medium', resolveHours: 3 },
  { cat: 'Impresoras', title: (c) => `Sin tóner en la impresora ${c[0]}`, desc: (c, area) => `La impresora ${c[0]} (${area}) indica nivel de tóner bajo y detiene las impresiones de documentos oficiales.`, prio: 'medium', resolveHours: 5 },
  { cat: 'Impresoras', title: () => 'Impresora con atasco de papel recurrente', desc: (c, area) => `La impresora del área ${area} presenta atasco de papel de forma recurrente al imprimir expedientes.`, prio: 'medium', resolveHours: 4 },
  { cat: 'Impresoras', title: () => 'Documentos impresos con manchas', desc: (c, area) => `Las impresiones de la impresora de ${area} salen con manchas oscuras en los documentos.`, prio: 'medium', resolveHours: 4 },
  { cat: 'Impresoras', title: () => 'Impresora no aparece en la red', desc: (c, area) => `La impresora de ${area} no aparece en la lista de dispositivos de red y no se puede imprimir.`, prio: 'high', resolveHours: 2 },
  { cat: 'Impresoras', title: () => 'Reposición de tóner/rodillos', desc: (c, area) => `Se solicita verificación de tóner y repuestos de la impresora de ${area}; el equipo ya no imprime en negro.`, prio: 'low', resolveHours: 6 },
  { cat: 'Impresoras', title: () => 'Impresora lenta al imprimir expedientes', desc: (c, area) => `La impresora de ${area} tarda demasiado en procesar las colas de impresión.`, prio: 'low', resolveHours: 3 },
  { cat: 'Computadoras', title: (c) => `PC ${c[0]} no enciende`, desc: (c, area) => `La computadora ${c[0]} del área ${area} no enciende después del corte eléctrico de hoy.`, prio: 'high', resolveHours: 4 },
  { cat: 'Computadoras', title: () => 'Equipo lento al abrir expedientes', desc: (c, area) => `La computadora de ${area} tarda mucho al abrir carpetas compartidas y expedientes.`, prio: 'medium', resolveHours: 5 },
  { cat: 'Computadoras', title: (c) => `Instalación de software en PC ${c[0]}`, desc: (c, area) => `Se requiere instalar actualizaciones y el lector de PDF en la PC ${c[0]} de ${area}.`, prio: 'low', resolveHours: 4 },
  { cat: 'Computadoras', title: (c) => `PC ${c[0]} se apaga sola`, desc: (c, area) => `La PC ${c[0]} de ${area} se apaga de forma inesperada durante la jornada.`, prio: 'high', resolveHours: 6 },
  { cat: 'Computadoras', title: () => 'Restablecimiento de contraseña de usuario', desc: (c, area) => `El usuario de ${area} olvidó su contraseña de acceso al dominio y al correo.`, prio: 'low', resolveHours: 2 },
  { cat: 'Red', title: () => 'Punto de red sin conectividad', desc: (c, area) => `El punto de red del área ${area} no entrega conectividad; el equipo queda sin acceso a internet.`, prio: 'high', resolveHours: 3 },
  { cat: 'Red', title: () => 'WiFi intermitente en el área', desc: (c, area) => `La red WiFi en ${area} se desconecta varias veces durante la jornada.`, prio: 'medium', resolveHours: 5 },
  { cat: 'Red', title: () => 'Revisión de patch panel y puerto', desc: (c, area) => `Se solicita revisión del patch panel en ${area} por pérdida de enlace intermitente.`, prio: 'medium', resolveHours: 4 },
  { cat: 'Correo', title: () => 'Correo institucional no sincroniza', desc: (c, area) => `En ${area}, Outlook no descarga los mensajes nuevos de la cuenta institucional.`, prio: 'medium', resolveHours: 3 },
  { cat: 'Correo', title: () => 'Reconfiguración de cuenta de correo', desc: (c, area) => `El usuario de ${area} necesita reconfigurar su perfil de correo tras el cambio de contraseña.`, prio: 'low', resolveHours: 2 },
  { cat: 'Telefonía', title: (c, area, ext) => `Sin tono en la extensión ${ext}`, desc: (c, area, ext) => `La extensión ${ext} del área ${area} no presenta tono al descolgar.`, prio: 'medium', resolveHours: 3 },
  { cat: 'Telefonía', title: () => 'Llamadas internacionales no salen', desc: (c, area) => `En ${area} no se logran realizar llamadas al exterior desde la extensión.`, prio: 'high', resolveHours: 4 },
  { cat: 'Otros', title: () => 'Fallo del UPS del puesto', desc: (c, area) => `El UPS del puesto en ${area} emite alarma ininterrumpida y el equipo no se mantiene encendido.`, prio: 'high', resolveHours: 4 },
  { cat: 'Otros', title: () => 'Soporte en sala de reuniones', desc: (c, area) => `Revisión de audio/video y configuración de la PC en la sala de reuniones.`, prio: 'low', resolveHours: 2 },
];

const MEETING_DATES = ['2026-07-08', '2026-07-23', '2026-08-06', '2026-08-20', '2026-09-04'];

const SSD_TICKET_DATE = '2026-07-15';
const TONER_WAIT_DATES = ['2026-07-28', '2026-08-12'];

const TECH_NOTES: Record<string, string[]> = {
  Impresoras: [
    'Se reemplazó el tóner y se ejecutó impresión de prueba.',
    'Se retiró el papel atascado y se verificó la alimentación de la bandeja.',
    'Se limpiaron los rodillos y se calibró la impresora.',
    'Se revisó la configuración de red y se restableció la impresión por IP.',
  ],
  Computadoras: [
    'Se actualizaron los controladores y se reinició el equipo.',
    'Se limpiaron archivos temporales y se optimizó el inicio del sistema.',
    'Se aplicaron las actualizaciones de Windows pendientes.',
  ],
  Red: [
    'Se reconfiguró el puerto del switch y se restableció el enlace.',
    'Se reinició el punto de red y se verificó la conectividad de extremo a extremo.',
  ],
  Correo: [
    'Se reconfiguraron las credenciales y se sincronizó la bandeja.',
    'Se reparó el perfil de Outlook y se verificó la recepción de mensajes.',
  ],
  Software: [
    'Se instaló el software solicitado y se verificó la licencia.',
    'Se completó la actualización del sistema operativo.',
  ],
  Telefonía: [
    'Se verificó el cableado y se restableció el tono de la extensión.',
    'Se revisó la configuración del ramal en la central telefónica.',
  ],
  Otros: [
    'Se realizó el soporte en sitio y se dejó el equipo operativo.',
  ],
};

const SOLUTIONS: Record<string, string[]> = {
  Impresoras: [
    'Tóner reemplazado y equipo operativo; se dejó impresión de prueba.',
    'Se liberó el atasco y se ajustó la bandeja; la impresora imprime normalmente.',
    'Se realizó limpieza interna y calibración de rodillos.',
    'Se reconfiguró la impresora en la red y quedó imprimiendo correctamente.',
  ],
  Computadoras: [
    'Se restableció el equipo y quedó operativo.',
    'Se optimizó el rendimiento y se verificó con el usuario.',
    'Software instalado y verificado.',
  ],
  Red: [
    'Se restableció la conectividad del punto de red.',
    'Se estabilizó la señal WiFi del área.',
  ],
  Correo: [
    'Cuenta configurada correctamente y bandeja sincronizada.',
  ],
  Software: [
    'Actualización aplicada y verificada.',
  ],
  Telefonía: [
    'Extensión operativa tras la revisión.',
  ],
  Otros: [
    'Soporte completado en sitio.',
  ],
};

async function seedAssets(users: User[]): Promise<Asset[]> {
  const assignableUsers = users.filter((user) => user.role === 'user');
  const rows: any[] = [];
  let index = 1;

  for (const group of ASSETS) {
    for (let offset = 0; offset < group.count; offset += 1) {
      const code = `PRB${String(group.startIndex + offset).padStart(3, '0')}`;
      const isLaptopInactive = group.type === 'laptop' && offset === 0;
      const isPrinterInactive = group.type === 'printer' && group.startIndex >= 45;
      const isSsdPc = code === 'PRB008';
      const isUpsMaintenance = group.type === 'ups' && offset === 0;

      rows.push({
        internalCode: code,
        type: group.type,
        brand: group.brand,
        model: group.model,
        serialNumber: serialFor(group.brand, index),
        status: (isLaptopInactive || isPrinterInactive ? 'inactive' : isSsdPc || isUpsMaintenance ? 'maintenance' : group.status || 'active') as AssetStatus,
        location: group.area || pickArea(group.type, code),
        assignedTo: ['computer', 'laptop'].includes(group.type)
          ? (isLaptopInactive ? null : pick(assignableUsers.map((u) => u.id), index))
          : null,
        acquisitionDate: acquisitionFor(group.type, code),
        observations: observationsFor(group.type, code, isLaptopInactive, isPrinterInactive),
        createdAt: atTime(addDays(localDate(2026, 6, 25), -(index % 20)), 8, 30),
        updatedAt: atTime(addDays(localDate(2026, 6, 25), -(index % 20)), 9, 0),
      });
      index += 1;
    }
  }

  return Asset.bulkCreate(rows, { returning: true });
}

function pickArea(type: Asset['type'], code: string): InstitutionalArea {
  if (type === 'switch' || type === 'router') return 'CCOM';
  if (type === 'other') return 'Gabinete';
  if (type === 'ups') return 'Administración';
  const areas = INSTITUTIONAL_AREAS.filter((area) => area !== 'CCOM');
  const hash = code.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return areas[hash % areas.length];
}

function acquisitionFor(type: Asset['type'], code: string): string {
  const hash = code.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const year = 2019 + (hash % 6);
  const month = 1 + (hash % 12);
  const day = 1 + (hash % 27);
  return dateOnly(year, month, day);
}

function observationsFor(type: Asset['type'], code: string, inactiveLaptop: boolean, inactivePrinter: boolean): string | null {
  if (inactiveLaptop) return 'Equipo en desuso por falla de batería; disponible para repuestos.';
  if (inactivePrinter) return 'Fuera de servicio por falta de tóner y repuestos; pendiente de compra.';
  if (code === 'PRB008') return 'En mantenimiento: instalación de disco SSD solicitado por lentitud del equipo.';
  if (code === 'PRB054') return 'En mantenimiento por reemplazo de baterías del UPS.';
  if (type === 'other') return 'Data show de la sala de reuniones; se utiliza para presentaciones institucionales.';
  if (type === 'printer') return `Impresora del área operativa; mantenimiento preventivo programado.`;
  return null;
}

async function seedInfrastructure(assets: Asset[], users: User[]): Promise<void> {
  const switches = assets.filter((asset) => asset.type === 'switch');
  const staffUsers = users.filter((user) => user.email !== baseAdmin.email);

  await NetworkPoint.bulkCreate(
    Array.from({ length: 24 }, (_, index) => {
      const location = pick(INSTITUTIONAL_AREAS.filter((area) => area !== 'CCOM'), index);
      const status = index % 13 === 0 ? 'faulty' : index % 15 === 0 ? 'inactive' : 'active';
      return {
        label: `RED-${String(index + 1).padStart(3, '0')}`,
        location,
        patchPanel: `PP-${1 + (index % 4)}`,
        switchId: switches.length ? pick(switches.map((s) => s.id), index) : null,
        switchPort: `Gi0/${1 + (index % 24)}`,
        status,
        observations: status === 'faulty' ? 'Pérdida de señal intermitente; se programó revisión.' : null,
        createdAt: atTime(addDays(localDate(2026, 6, 26), -(index % 22)), 10, 15),
        updatedAt: atTime(addDays(localDate(2026, 6, 26), -(index % 22)), 11, 0),
      };
    }) as any[]
  );

  await Extension.bulkCreate(
    staffUsers.map((user, index) => {
      const seed = staffSeeds.find((item) => item.email === user.email);
      const area = (user.area || 'Gabinete') as InstitutionalArea;
      return {
        extensionNumber: String(seed?.interno ?? 401 + index),
        ipAddress: `${domainOf(area)}.${200 + (seed?.interno ?? 400) - 401}`,
        phoneId: null,
        assignedTo: user.id,
        location: area,
        status: seed?.interno === 424 || seed?.interno === 428 ? 'inactive' : 'active',
        createdAt: atTime(localDate(2026, 6, 24), 9, 0),
        updatedAt: atTime(localDate(2026, 6, 24), 9, 30),
      };
    }) as any[]
  );
}

async function seedMaintenances(assets: Asset[], technicians: User[]): Promise<void> {
  const printers = assets.filter((asset) => asset.type === 'printer');
  const upsAssets = assets.filter((asset) => asset.type === 'ups');
  const rows: any[] = [];

  printers.forEach((printer, index) => {
    const scheduled = atTime(addDays(localDate(2026, 7, 1), index % 20), 8, 0);
    rows.push({
      assetId: printer.id,
      type: index % 4 === 0 ? 'corrective' : 'preventive',
      scheduledDate: dateOnly(scheduled.getFullYear(), scheduled.getMonth() + 1, scheduled.getDate()),
      performedDate: dateOnly(scheduled.getFullYear(), scheduled.getMonth() + 1, scheduled.getDate()),
      technicianId: pick(technicians.map((t) => t.id), index),
      observations: index % 4 === 0
        ? 'Se corrigió falla de impresión; reemplazo de tóner y limpieza de rodillos.'
        : 'Mantenimiento preventivo: limpieza, calibración y verificación de bandejas.',
      nextMaintenanceDate: dateOnly(2026, 8 + (index % 2), 1 + (index % 20)),
      createdAt: addDays(localDate(2026, 7, 1), index % 20),
      updatedAt: addHours(atTime(addDays(localDate(2026, 7, 1), index % 20), 9, 0), 2),
    });
  });

  upsAssets.forEach((ups, index) => {
    rows.push({
      assetId: ups.id,
      type: 'preventive',
      scheduledDate: '2026-08-10',
      performedDate: null,
      technicianId: pick(technicians.map((t) => t.id), index),
      observations: 'Programado: verificación de baterías y prueba de respaldo de energía.',
      nextMaintenanceDate: '2026-11-10',
      createdAt: localDate(2026, 8, 8),
      updatedAt: localDate(2026, 8, 8),
    });
  });

  await Maintenance.bulkCreate(rows);
}

function buildTicketList(users: User[], technicians: User[]): any[] {
  const requesters = users.filter((user) => user.role === 'user');
  const admin = users.find((user) => user.email === baseAdmin.email) ?? technicians[0];
  const gabineteUsers = requesters.filter((u) => u.area === 'Gabinete');
  const start = localDate(2026, 7, 1);
  const end = localDate(2026, 9, 9);
  const workdays = workdaysBetween(start, end);
  const nearEndStart = localDate(2026, 9, 7);
  const tickets: any[] = [];
  const meetingSet = new Set(MEETING_DATES);
  let ticketIndex = 0;

  workdays.forEach((day, dayIndex) => {
    const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const count = 1 + (dayIndex % 3);

    for (let slot = 0; slot < count; slot += 1) {
      const createdAt = atTime(day, 8 + ((slot * 3 + dayIndex) % 9), (dayIndex * 11 + slot * 17) % 60);
      const isMeeting = meetingSet.has(dayKey);
      const isNearEnd = day >= nearEndStart;
      const isSsd = dayKey === SSD_TICKET_DATE;
      const isTonerWait = TONER_WAIT_DATES.includes(dayKey);

      const template: CaseTemplate = isMeeting
        ? {
            title: () => `Preparación de data show y PC para presentación en la sala de reuniones`,
            desc: () => `Se requiere armar el data show y la PC en la sala de reuniones para la presentación institucional programada hoy.`,
            prio: 'low',
            resolveHours: 1,
            cat: 'Otros',
          }
        : isSsd
          ? {
              title: (codes) => `PC ${codes[0]} lenta, requiere disco SSD`,
              desc: (codes, area) => `La PC ${codes[0]} del área ${area} presenta lentitud extrema; se solicita reemplazo del disco mecánico por un SSD.`,
              prio: 'medium',
              resolveHours: 72,
              cat: 'Computadoras',
            }
          : isTonerWait
            ? {
                title: (codes) => `Sin tóner para la impresora ${codes[0]}`,
                desc: (codes, area) => `La impresora ${codes[0]} de ${area} se quedó sin tóner; se espera la llegada del repuesto para reactivarla.`,
                prio: 'medium',
                resolveHours: 48,
                cat: 'Impresoras',
              }
            : pick(CASE_TEMPLATES, ticketIndex);

      const printerCode = isTonerWait ? 'PRB046' : pick(PRINTER_CODES, ticketIndex);
      const computerCode = isSsd ? 'PRB008' : pick(COMPUTER_CODES, ticketIndex);
      const area = pick(areaOf(gabineteUsers, requesters), ticketIndex) as InstitutionalArea;
      const ext = isMeeting ? '' : String(staffSeeds[(ticketIndex % staffSeeds.length)].interno);
      const codes = template.cat === 'Computadoras' ? [computerCode, printerCode] : [printerCode, computerCode];

      const status: Ticket['status'] = isNearEnd
        ? slot % 3 === 0 ? 'pending' : slot % 3 === 1 ? 'in_progress' : 'resolved'
        : 'resolved';

      const requester = isMeeting
        ? pick(gabineteUsers.map((u) => u.id), ticketIndex)
        : pick(requesters.map((u) => u.id), ticketIndex);
      const technician = pick(technicians.map((t) => t.id), ticketIndex);

      let resolutionDate: Date | null = null;
      if (status === 'resolved') {
        const delayHours = isSsd ? 72 : isTonerWait ? 48 : template.resolveHours + (slot % 2);
        resolutionDate = addHours(createdAt, delayHours);
      }

      tickets.push({
        title: renderTitle(template.title, codes, area, ext),
        description: renderDesc(template, codes, area, ext),
        category: template.cat,
        location: area,
        attachments: [],
        status,
        priority: template.prio,
        requestedBy: requester,
        assignedTo: status === 'pending' ? null : technician,
        resolutionDate,
        createdAt,
        updatedAt: resolutionDate ?? addHours(createdAt, 2),
        _meta: {
          category: template.cat,
          techNote: pickNotes(TECH_NOTES, template.cat, ticketIndex),
          solution: pickNotes(SOLUTIONS, template.cat, ticketIndex),
          technician,
          requester,
          isMeeting,
          isNearEnd,
          adminId: admin.id,
        },
      });

      ticketIndex += 1;
    }
  });

  return tickets;
}

function renderTitle(titleFn: CaseTemplate['title'], codes: string[], area: InstitutionalArea, ext: string): string {
  return titleFn(codes, area as string, ext);
}

function renderDesc(template: CaseTemplate, codes: string[], area: InstitutionalArea, ext: string): string {
  return template.desc(codes, area as string, ext);
}

function pickNotes(bank: Record<string, string[]>, category: string, index: number): string {
  const list = bank[category] || bank.Otros;
  return list[index % list.length];
}

function areaOf(gabineteUsers: User[], requesters: User[]): string[] {
  return INSTITUTIONAL_AREAS.filter((area) => area !== 'CCOM');
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

async function seedTickets(users: User[], technicians: User[]): Promise<Ticket[]> {
  const admin = users.find((user) => user.email === baseAdmin.email) ?? technicians[0];
  const built = buildTicketList(users, technicians);
  const tickets = await Ticket.bulkCreate(
    built.map(({ _meta, ...data }) => data),
    { returning: true }
  );

  const comments: any[] = [];
  const histories: any[] = [];
  const auditLogs: any[] = [];
  const requesters = users.filter((user) => user.role === 'user');

  tickets.forEach((ticket, index) => {
    const meta = built[index]._meta;
    const createdAt = new Date(ticket.createdAt);

    histories.push({
      ticketId: ticket.id,
      userId: meta.requester,
      action: 'ticket_created',
      actorRole: 'user',
      field: 'status',
      oldValue: null,
      newValue: 'pending',
      previousStatus: null,
      newStatus: 'pending',
      assignedTechnicianId: null,
      priority: ticket.priority,
      comment: 'Solicitud registrada por el usuario.',
      solution: null,
      createdAt,
    });

    if (ticket.assignedTo) {
      const assignedAt = addHours(createdAt, 1);
      histories.push({
        ticketId: ticket.id,
        userId: admin.id,
        action: 'ticket_assigned',
        actorRole: 'admin',
        field: 'assignedTo',
        oldValue: null,
        newValue: technicians.find((t) => t.id === ticket.assignedTo)?.name ?? 'Técnico',
        previousStatus: 'pending',
        newStatus: 'pending',
        assignedTechnicianId: ticket.assignedTo,
        priority: ticket.priority,
        comment: 'Asignación al equipo técnico de CCOM.',
        solution: null,
        createdAt: assignedAt,
      });
    }

    if (!meta.isNearEnd || ticket.status !== 'pending') {
      comments.push({
        ticketId: ticket.id,
        userId: technicians.find((t) => t.id === ticket.assignedTo)?.id ?? meta.technician,
        comment: meta.techNote,
        createdAt: addHours(createdAt, 2),
        updatedAt: addHours(createdAt, 2),
      });
    }

    if (['in_progress', 'resolved'].includes(ticket.status)) {
      histories.push({
        ticketId: ticket.id,
        userId: ticket.assignedTo ?? meta.technician,
        action: 'status_updated',
        actorRole: 'technician',
        field: 'status',
        oldValue: 'pending',
        newValue: ticket.status,
        previousStatus: 'pending',
        newStatus: ticket.status,
        assignedTechnicianId: ticket.assignedTo ?? meta.technician,
        priority: ticket.priority,
        comment: 'Trabajo en curso en el equipo.',
        solution: null,
        createdAt: addHours(createdAt, 3),
      });
    }

    if (ticket.status === 'resolved') {
      histories.push({
        ticketId: ticket.id,
        userId: ticket.assignedTo ?? meta.technician,
        action: 'ticket_resolved',
        actorRole: 'technician',
        field: 'status',
        oldValue: 'in_progress',
        newValue: 'resolved',
        previousStatus: 'in_progress',
        newStatus: 'resolved',
        assignedTechnicianId: ticket.assignedTo ?? meta.technician,
        priority: ticket.priority,
        comment: meta.techNote,
        solution: meta.solution,
        createdAt: ticket.resolutionDate ?? addHours(createdAt, 6),
      });

      comments.push({
        ticketId: ticket.id,
        userId: meta.requester,
        comment: 'Confirmo que el servicio quedó funcionando correctamente.',
        createdAt: addHours(ticket.resolutionDate ?? createdAt, 1),
        updatedAt: addHours(ticket.resolutionDate ?? createdAt, 1),
      });

      auditLogs.push({
        userId: ticket.assignedTo ?? meta.technician,
        action: 'Registro de atención',
        entity: 'Ticket',
        entityId: ticket.id,
        ipAddress: auditIp(requesters, meta.requester, index),
        oldData: null,
        newData: { title: ticket.title, status: ticket.status, priority: ticket.priority },
        createdAt: ticket.resolutionDate ?? addHours(createdAt, 6),
      });
    }
  });

  staffSeeds.slice(0, 12).forEach((seed, index) => {
    const user = users.find((u) => u.email === seed.email);
    if (!user) return;
    auditLogs.push({
      userId: user.id,
      action: 'Registro de atención',
      entity: 'Auth',
      entityId: user.id,
      ipAddress: `${domainOf(seed.area)}.${20 + index}`,
      oldData: null,
      newData: { event: 'Inicio de sesión', email: seed.email },
      createdAt: atTime(addDays(localDate(2026, 7, 1), (index * 5) % 40), 8, 30),
    });
  });

  await TicketHistory.bulkCreate(histories);
  await TicketComment.bulkCreate(comments);
  await AuditLog.bulkCreate(auditLogs);

  return tickets;
}

function auditIp(requesters: User[], requesterId: number, index: number): string {
  const requester = requesters.find((u) => u.id === requesterId);
  const base = domainOf((requester?.area || 'Gabinete') as InstitutionalArea);
  return `${base}.${20 + (index % 200)}`;
}

async function seed(): Promise<void> {
  try {
    console.log('Preparando datos ficticios para demostración...');
    await ensureDatabaseExists();
    await sequelize.authenticate();

    await clearOperationalData();

    const users = await createOrKeepUsers();
    const admin = users.find((user) => user.email === baseAdmin.email) ?? users.find((user) => user.role === 'admin');
    const technicians = users.filter((user) => user.role === 'technician' && user.isActive);

    if (!admin || technicians.length === 0) {
      throw new Error('Se requiere al menos un administrador y un técnico activo para crear la demostración.');
    }

    const assets = await seedAssets(users);
    await seedInfrastructure(assets, users);
    await seedMaintenances(assets, technicians);
    const tickets = await seedTickets(users, technicians);

    console.log(`Usuarios creados: ${users.length}`);
    console.log(`Activos creados: ${assets.length}`);
    console.log(`Tickets creados: ${tickets.length}`);
    console.log('Credenciales de acceso:');
    console.log(`  Administrador del sistema: ${baseAdmin.email} / ${baseAdmin.password}`);
    staffSeeds.slice(0, 6).forEach((seed) => {
      console.log(`  ${seed.name}: ${seed.email} / ${seed.password}`);
    });
    console.log('... y el resto de usuarios con formato nombre123 sobre su primer nombre.');
    console.log('Datos ficticios listos para la presentación.');
    process.exit(0);
  } catch (error) {
    console.error('No se pudieron preparar los datos ficticios:', error);
    process.exit(1);
  }
}

seed();