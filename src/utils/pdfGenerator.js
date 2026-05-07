const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const PDFDocument = require('pdfkit');

const ensureUploadsPath = async (folder) => {
  const fullPath = path.join(__dirname, '..', 'uploads', folder);
  await fsPromises.mkdir(fullPath, { recursive: true });
  return fullPath;
};

exports.generatePrescriptionPdf = async (prescription) => {
  const folder = 'prescriptions';
  const uploadPath = await ensureUploadsPath(folder);
  const filename = `${Date.now()}-prescription-${prescription._id}.pdf`;
  const filePath = path.join(uploadPath, filename);
  const writeStream = fs.createWriteStream(filePath);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(writeStream);

  doc.fontSize(18).text('Prescription', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Prescription ID: ${prescription._id}`);
  doc.text(`Patient: ${prescription.patient.name || prescription.patient}`);
  doc.text(`Doctor: ${prescription.doctor?.name || prescription.doctor || 'N/A'}`);
  doc.text(`Date: ${new Date(prescription.created_at).toLocaleDateString()}`);
  doc.moveDown();
  doc.fontSize(14).text('Medicines', { underline: true });
  doc.moveDown();

  prescription.medicines.forEach((medicine, index) => {
    doc.fontSize(12).text(`${index + 1}. ${medicine.name}`);
    doc.text(`   Dosage: ${medicine.dosage}`);
    doc.text(`   Duration: ${medicine.duration}`);
    if (medicine.notes) {
      doc.text(`   Notes: ${medicine.notes}`);
    }
    doc.moveDown();
  });

  if (prescription.notes) {
    doc.fontSize(14).text('Notes', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(prescription.notes);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  return {
    pdfUrl: `/uploads/${folder}/${filename}`,
    pdfPath: filePath,
  };
};
