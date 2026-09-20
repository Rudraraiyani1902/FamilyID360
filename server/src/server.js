const dotenv = require('dotenv');
dotenv.config(); // MUST be first — loads .env before any other module reads process.env

const express = require('express');
const { sequelize } = require('./models/index');
const authRoutes = require('./routes/auth.routes');
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/auth', authRoutes);

sequelize.authenticate()
  .then(() => {
    console.log('Supabase PostgreSQL connected');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
  });