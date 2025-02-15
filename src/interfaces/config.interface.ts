export interface DatabaseConfig {
  url: string;
  retryAttempts: number;
  retryDelay: number;
  backupPath: string;
}

export interface LoggerConfig {
  level: string;
  format: string;
  filename?: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface Config {
  port: number;
  env: string;
  database: DatabaseConfig;
  logger: LoggerConfig;
  jwt: JwtConfig;
}
