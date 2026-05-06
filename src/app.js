const express = require('express');
const cors = require('cors');

// User Routes
const appointmentRoutes = require('./routes/user/appointmentRoutes');
const contactRoutes = require('./routes/user/contactRoutes');
const slotRoutes = require('./routes/user/slotRoutes');
const authRoutes = require('./routes/user/authRoutes');
const paymentRoutes = require('./routes/user/paymentRoutes');

// Admin Routes
const appointmentAdminRoutes = require('./routes/admin/appointmentAdminRoutes');
const slotAdminRoutes = require('./routes/admin/slotAdminRoutes');
const dashboardAdminRoutes = require('./routes/admin/dashboardRoutes');
const settingsRoutes = require('./routes/admin/settingsRoutes');

// Public Routes
const blogRoutes = require('./routes/blogRoutes');
const productRoutes = require('./routes/admin/productRoutes');

const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// User Routes
app.use('/api/user/appointments', appointmentRoutes);
app.use('/api/user/contacts', contactRoutes);
app.use('/api/user/slots', slotRoutes);
app.use('/api/user/payments', paymentRoutes);
app.use('/api/auth', authRoutes);

// Admin Routes
app.use('/api/admin/appointments', appointmentAdminRoutes);
app.use('/api/admin/slots', slotAdminRoutes);
app.use('/api/admin/dashboard', dashboardAdminRoutes);
app.use('/api/admin/settings', settingsRoutes);

// Public Routes
app.use('/api/blog', blogRoutes);
app.use('/api/products', productRoutes);

app.use(errorMiddleware);

module.exports = app;
