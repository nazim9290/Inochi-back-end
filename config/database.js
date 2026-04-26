const { Sequelize } = require('sequelize');

const buildConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      url: process.env.DATABASE_URL,
      options: {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions:
          process.env.PG_SSL === 'true'
            ? { ssl: { require: true, rejectUnauthorized: false } }
            : {},
        define: {
          underscored: true,
          freezeTableName: false,
        },
      },
    };
  }

  return {
    options: {
      host: process.env.PG_HOST || 'localhost',
      port: Number(process.env.PG_PORT) || 5432,
      username: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || '',
      database: process.env.PG_DATABASE || 'inochi',
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions:
        process.env.PG_SSL === 'true'
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : {},
      define: {
        underscored: true,
        freezeTableName: false,
      },
    },
  };
};

const cfg = buildConfig();
const sequelize = cfg.url ? new Sequelize(cfg.url, cfg.options) : new Sequelize(cfg.options);

module.exports = sequelize;
