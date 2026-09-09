const express = require('express');
const cors = require('cors');
const path = require('path');

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
const webCategoryRoutes = require('./routes/web/categoryRoutes');
const webPaymentRoutes = require('./routes/web/paymentRoutes');
const webAuthRoutes = require('./routes/web/authRoutes');
const webContactRoutes = require('./routes/web/contactRoutes');
const webGoogleReviewsRoutes = require('./routes/web/googleReviewsRoutes');
const webReviewRoutes = require('./routes/web/reviewRoutes');
const webChatRoutes = require('./routes/web/chatRoutes');

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
const categoryAdminRoutes = require('./routes/admin/categoryAdminRoutes');
const reviewAdminRoutes = require('./routes/admin/reviewAdminRoutes');

const errorMiddleware = require('./middlewares/errorMiddleware');

// SEO Routes
const seoRoutes = require('./routes/web/seoRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/web/categories', webCategoryRoutes);
app.use('/api/web/payments', webPaymentRoutes);
app.use('/api/web/auth', webAuthRoutes);
app.use('/api/web/contacts', webContactRoutes);
app.use('/api/web/google-reviews', webGoogleReviewsRoutes);
app.use('/api/web/chat', webChatRoutes);
app.use('/api/chat', webChatRoutes);
app.use('/api/web', webReviewRoutes);
app.use('/api', webReviewRoutes);
app.use('/api/auth', webAuthRoutes);

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
app.use('/api/admin/categories', categoryAdminRoutes);
app.use('/api/admin/reviews', reviewAdminRoutes);

// SEO Public Routes
app.use('/api/blog', webBlogRoutes);
app.use('/api/products', webProductRoutes);
app.use('/api/category', webCategoryRoutes);

// SEO Routes (sitemap, robots)
app.use('/api/seo', seoRoutes);

app.use(errorMiddleware);

module.exports = app;
