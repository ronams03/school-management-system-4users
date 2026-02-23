import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const isDevelopment = process.env.NODE_ENV === 'development';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'school_management',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD ?? '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: isDevelopment ? false : false,
    timezone: '+00:00',
    define: {
      underscored: false,
      freezeTableName: false,
    },
  }
);

export const connectDatabase = async () => {
  await sequelize.authenticate();
};

export default sequelize;
