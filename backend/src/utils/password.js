import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(String(plainPassword), SALT_ROUNDS);
};

export const comparePassword = async (plainPassword, passwordHash) => {
  return bcrypt.compare(String(plainPassword), String(passwordHash));
};
