const express = require('express');
const cors = require('cors');

const appointmentRoutes = require('./routes/user/appointmentRoutes');
const contactRoutes = require('./routes/user/contactRoutes');
const slotRoutes = require('./routes/user/slotRoutes');
const authRoutes = require('./routes/user/authRoutes');
const appointmentAdminRoutes = require('./routes/admin/appointmentAdminRoutes');
const slotAdminRoutes = require('./routes/admin/slotAdminRoutes');
const dashboardAdminRoutes = require('./routes/admin/dashboardRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/user/appointments', appointmentRoutes);
app.use('/api/user/contacts', contactRoutes);
app.use('/api/user/slots', slotRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/appointments', appointmentAdminRoutes);
app.use('/api/admin/slots', slotAdminRoutes);
app.use('/api/admin/dashboard', dashboardAdminRoutes);

app.use(errorMiddleware);

module.exports = app;
