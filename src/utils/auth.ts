import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};


export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: any): string => {
  const options: SignOptions = { 
    expiresIn: parseInt(config.jwt.expiresIn) || '24h'
  };
  return jwt.sign(payload, config.jwt.secret as Secret, options);
}; 