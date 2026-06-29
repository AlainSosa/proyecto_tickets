import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../database/models';
import { UnauthorizedError, ConflictError } from '../utils/errors';
import { InstitutionalArea } from '../constants/institutionalAreas';

export class AuthService {
  async login(email: string, password: string): Promise<{ token: string; user: Partial<User> }> {
    const user = await User.findOne({ where: { email, isActive: true } });

    if (!user) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    const { password: _, ...userWithoutPassword } = user.toJSON();

    return { token, user: userWithoutPassword };
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: 'admin' | 'technician' | 'user';
    area: InstitutionalArea;
  }): Promise<{ token: string; user: Partial<User> }> {
    const existingUser = await User.findOne({ where: { email: data.email } });

    if (existingUser) {
      throw new ConflictError('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: passwordHash,
      role: data.role || 'user',
      area: data.area,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    const { password: _, ...userWithoutPassword } = user.toJSON();

    return { token, user: userWithoutPassword };
  }

  async getProfile(userId: number): Promise<Partial<User>> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }
}
