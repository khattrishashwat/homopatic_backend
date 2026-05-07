const express = require('express');
const cors = require('cors');

// User Routes
const appointmentRoutes = require('./routes/user/appointmentRoutes');
const contactRoutes = require('./routes/user/contactRoutes');
const slotRoutes = require('./routes/user/slotRoutes');
const authRoutes = require('./routes/user/authRoutes');
const paymentRoutes = require('./routes/user/paymentRoutes');

// Website API Routes
const webAppointmentRoutes = require('./routes/web/appointmentRoutes');
const webSlotRoutes = require('./routes/web/slotRoutes');
const webPatientRoutes = require('./routes/web/patientRoutes');
const webPrescriptionRoutes = require('./routes/web/prescriptionRoutes');
const webMedicalRecordRoutes = require('./routes/web/medicalRecordRoutes');
const webOrderRoutes = require('./routes/web/orderRoutes');
const webNotificationRoutes = require('./routes/web/notificationRoutes');
const webSettingsRoutes = require('./routes/web/settingsRoutes');
const webProductRoutes = require('./routes/web/productRoutes');
const webBlogRoutes = require('./routes/web/blogRoutes');
const webPaymentRoutes = require('./routes/user/paymentRoutes');

// Admin Routes
const appointmentAdminRoutes = require('./routes/admin/appointmentAdminRoutes');
const slotAdminRoutes = require('./routes/admin/slotAdminRoutes');
const dashboardAdminRoutes = require('./routes/admin/dashboardRoutes');
const settingsRoutes = require('./routes/admin/settingsRoutes');
const patientAdminRoutes = require('./routes/admin/patientAdminRoutes');
const prescriptionAdminRoutes = require('./routes/admin/prescriptionAdminRoutes');
const medicalRecordAdminRoutes = require('./routes/admin/medicalRecordAdminRoutes');
const orderAdminRoutes = require('./routes/admin/orderAdminRoutes');
const notificationAdminRoutes = require('./routes/admin/notificationAdminRoutes');
const paymentAdminRoutes = require('./routes/admin/paymentAdminRoutes');
const productAdminRoutes = require('./routes/admin/productAdminRoutes');
const blogAdminRoutes = require('./routes/admin/blogAdminRoutes');

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

// Website API Routes
app.use('/api/web/appointments', webAppointmentRoutes);
app.use('/api/web/slots', webSlotRoutes);
app.use('/api/web/patients', webPatientRoutes);
app.use('/api/web/prescriptions', webPrescriptionRoutes);
app.use('/api/web/medical-records', webMedicalRecordRoutes);
app.use('/api/web/orders', webOrderRoutes);
app.use('/api/web/notifications', webNotificationRoutes);
app.use('/api/web/settings', webSettingsRoutes);
app.use('/api/web/products', webProductRoutes);
app.use('/api/web/blogs', webBlogRoutes);
app.use('/api/web/payments', webPaymentRoutes);

// Admin Routes
app.use('/api/admin/appointments', appointmentAdminRoutes);
app.use('/api/admin/slots', slotAdminRoutes);
app.use('/api/admin/dashboard', dashboardAdminRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/patients', patientAdminRoutes);
app.use('/api/admin/prescriptions', prescriptionAdminRoutes);
app.use('/api/admin/medical-records', medicalRecordAdminRoutes);
app.use('/api/admin/orders', orderAdminRoutes);
app.use('/api/admin/notifications', notificationAdminRoutes);
app.use('/api/admin/payments', paymentAdminRoutes);
app.use('/api/admin/products', productAdminRoutes);
app.use('/api/admin/blogs', blogAdminRoutes);

// Public Routes
app.use('/api/blog', blogRoutes);
app.use('/api/products', productRoutes);

app.use(errorMiddleware);

module.exports = app;
