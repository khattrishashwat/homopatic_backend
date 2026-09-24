const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ======================================================
// Website API Routes
// ======================================================

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
const webFaqRoutes = require('./routes/web/faqRoutes');
const webCouponRoutes = require('./routes/web/couponWebRoutes');

// ======================================================
// Admin Routes
// ======================================================

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
const googleReviewsAdminRoutes = require('./routes/admin/googleReviewsAdminRoutes');
const faqAdminRoutes = require('./routes/admin/faqAdminRoutes');
const chatbotAdminRoutes = require('./routes/admin/chatbotAdminRoutes');
const couponAdminRoutes = require('./routes/admin/couponAdminRoutes');

const errorMiddleware = require('./middlewares/errorMiddleware');

// ======================================================
// SEO Routes
// ======================================================

const seoRoutes = require('./routes/web/seoRoutes');

const app = express();

// ======================================================
// Global Middleware
// ======================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ======================================================
// Serve Uploaded Files
// ======================================================

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// ======================================================
// Website API Routes
// ======================================================

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

app.use('/api/web/faqs', webFaqRoutes);

app.use('/api/web/coupons', webCouponRoutes);

app.use('/api/web', webReviewRoutes);

app.use('/api', webReviewRoutes);

app.use('/api/auth', webAuthRoutes);

// ======================================================
// Admin API Routes
// ======================================================

app.use('/api/admin/auth', webAuthRoutes);

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

app.use('/api/admin/google-reviews', googleReviewsAdminRoutes);

app.use('/api/admin/faqs', faqAdminRoutes);

app.use('/api/admin/chatbot/questions', chatbotAdminRoutes);

app.use('/api/admin/coupons', couponAdminRoutes);

// ======================================================
// SEO Public Routes
// ======================================================

app.use('/api/blog', webBlogRoutes);

app.use('/api/products', webProductRoutes);

app.use('/api/category', webCategoryRoutes);

// ======================================================
// SEO Routes
// ======================================================

app.use('/api/seo', seoRoutes);

// ======================================================
// FRONTEND PRODUCTION BUILD PATHS
// ======================================================
//
// Expected structure:
//
// backend/
// └── src/
//     ├── app.js
//     ├── web/
//     │   └── dist/
//     │       ├── index.html
//     │       └── assets/
//     │
//     └── admin-panel/
//         └── dist/
//             ├── index.html
//             └── assets/
//
// ======================================================

const webDistPath = path.resolve(
  __dirname,
  'web',
  'dist'
);

const adminDistPath = path.resolve(
  __dirname,
  'admin-panel',
  'dist'
);

const webIndexPath = path.join(
  webDistPath,
  'index.html'
);

const adminIndexPath = path.join(
  adminDistPath,
  'index.html'
);

// ======================================================
// Frontend Build Verification
// ======================================================

console.log('==========================================');
console.log('Frontend Build Configuration');
console.log('==========================================');

console.log('Web Dist Path:', webDistPath);

console.log(
  'Web index.html:',
  webIndexPath
);

console.log(
  'Web index exists:',
  fs.existsSync(webIndexPath)
);

console.log(
  'Admin Dist Path:',
  adminDistPath
);

console.log(
  'Admin index.html:',
  adminIndexPath
);

console.log(
  'Admin index exists:',
  fs.existsSync(adminIndexPath)
);

console.log('==========================================');

// ======================================================
// SERVE WEB FRONTEND AT ROOT (/)
// ======================================================
//
// http://localhost:5000/
// http://localhost:5000/about
// http://localhost:5000/contact
// http://localhost:5000/appointment
//
// ======================================================

if (fs.existsSync(webDistPath)) {
  app.use(
    '/',
    express.static(webDistPath)
  );
} else {
  console.error(
    `Web frontend build not found: ${webDistPath}`
  );
}

// ======================================================
// SERVE ADMIN PANEL AT /admin-panel
// ======================================================
//
// http://localhost:5000/admin-panel
// http://localhost:5000/admin-panel/login
// http://localhost:5000/admin-panel/dashboard
//
// ======================================================

if (fs.existsSync(adminDistPath)) {
  app.use(
    '/admin-panel',
    express.static(adminDistPath)
  );
} else {
  console.error(
    `Admin Panel frontend build not found: ${adminDistPath}`
  );
}

// ======================================================
// WEB FRONTEND SPA FALLBACK
// ======================================================
//
// IMPORTANT:
// API, uploads and admin-panel routes are excluded.
//
// Web:
// /
// /about
// /contact
// /appointment
// /blogs
// etc.
//
// ======================================================

app.get(
  /^\/(?!api(?:\/|$)|uploads(?:\/|$)|admin-panel(?:\/|$)).*/,
  (req, res) => {
    if (fs.existsSync(webIndexPath)) {
      return res.sendFile(webIndexPath);
    }

    return res.status(404).send(
      'Web frontend build not found. Please build the frontend first.'
    );
  }
);

// ======================================================
// ADMIN PANEL SPA FALLBACK
// ======================================================
//
// /admin-panel
// /admin-panel/
// /admin-panel/login
// /admin-panel/dashboard
// etc.
//
// ======================================================

app.get(
  /^\/admin-panel(?:\/.*)?$/,
  (req, res) => {
    if (fs.existsSync(adminIndexPath)) {
      return res.sendFile(adminIndexPath);
    }

    return res.status(404).send(
      'Admin Panel frontend build not found. Please build the frontend first.'
    );
  }
);

// ======================================================
// Error Middleware
// ======================================================

app.use(errorMiddleware);

module.exports = app;
