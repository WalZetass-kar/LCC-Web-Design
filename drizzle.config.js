export default {
  schema: './backend/models/schema.js',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './sistem_pos.db'
  }
};
