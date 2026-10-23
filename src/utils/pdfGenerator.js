const PDFDocument = require('pdfkit');

exports.generatePrescriptionPdf = async (prescription) => {
  return new Promise((resolve, reject) => {
    const filename = `${prescription.prescriptionNumber || prescription._id || 'prescription'}.pdf`;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        filename,
      });
    });
    doc.on('error', (err) => reject(err));

    const primaryColor = '#0f3a5d'; // Deep navy blue
  const accentColor = '#b91c1c';  // Medical red
  const textColor = '#1f2937';     // Dark neutral
  const mutedColor = '#6b7280';    // Muted gray
  const lineColor = '#d1d5db';     // Border line

  // --- HEADER SECTION ---
  // Left: Doctor Info
  const docInfo = prescription.doctor_info || {};
  doc.font('Helvetica-Bold').fontSize(14).fillColor(primaryColor).text(docInfo.name || 'Dr. Parth Bhargava', 40, 40);
  doc.font('Helvetica').fontSize(9).fillColor(textColor).text(docInfo.qualification || 'BHMS, Homoeopathic Physician', 40, 58);
  doc.fontSize(8.5).fillColor(mutedColor).text(`Reg. No: ${docInfo.reg_no || 'H043267'}`, 40, 71);
  doc.fontSize(8).text(`Spcl: ${docInfo.specialization || 'Allergy, Nasal Polyp, Renal Calculi, Migraine'}`, 40, 84, { width: 230 });
  doc.fontSize(8.5).fillColor(textColor).text(`Mobile: ${docInfo.phone || '+91 7668610031'}`, 40, 106);

  // Right: Clinic Branding
  const clinicInfo = prescription.clinic_info || {};
  doc.font('Helvetica-Bold').fontSize(18).fillColor(accentColor).text(clinicInfo.name || 'MD’s HOMOEOPATHY', 290, 40, { align: 'right', width: 265 });
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(primaryColor).text(`"${clinicInfo.tagline || 'A Destination for A Permanent Cure And Perfect Care'}"`, 290, 62, { align: 'right', width: 265 });
  doc.font('Helvetica').fontSize(8).fillColor(mutedColor).text(clinicInfo.address || 'Deeg Gali Kachchi Sadak, Lal Darwaza, Mathura', 290, 77, { align: 'right', width: 265 });
  doc.fontSize(8).text(`Email: ${clinicInfo.email || 'contact@mdshomoeopathy.com'} | Web: ${clinicInfo.website || 'www.mdshomoeopathy.com'}`, 290, 90, { align: 'right', width: 265 });

  // Top Divider
  doc.strokeColor(accentColor).lineWidth(1.5).moveTo(40, 122).lineTo(555, 122).stroke();

  // --- PATIENT INFO STRIPE ---
  const patient = prescription.patient || {};
  const patientSnapshot = prescription.patient_snapshot || {};
  const patientId = patientSnapshot.patientId || patient.patientId || 'N/A';
  const patientName = patientSnapshot.name || patient.name || 'Patient';
  const gender = patientSnapshot.gender || patient.gender || '-';
  const age = patientSnapshot.age || (patient.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '-');
  const rxDate = prescription.prescription_date ? new Date(prescription.prescription_date).toLocaleDateString('en-IN') : new Date(prescription.created_at).toLocaleDateString('en-IN');
  const rxNo = prescription.prescriptionNumber || `RX-${String(prescription._id).slice(-6).toUpperCase()}`;

  // Gray info box
  doc.rect(40, 128, 515, 36).fill('#f3f4f6');
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9);
  doc.text('Patient ID:', 48, 134).font('Helvetica').text(patientId, 105, 134);
  doc.font('Helvetica-Bold').text('Name:', 220, 134).font('Helvetica').text(patientName, 255, 134);
  doc.font('Helvetica-Bold').text('Age / Gender:', 410, 134).font('Helvetica').text(`${age}y / ${gender}`, 475, 134);

  doc.font('Helvetica-Bold').text('Date:', 48, 149).font('Helvetica').text(rxDate, 78, 149);
  doc.font('Helvetica-Bold').text('Rx No:', 220, 149).font('Helvetica').text(rxNo, 255, 149);

  // --- VITALS STRIPE (if any) ---
  const vitals = prescription.vitals || {};
  const vitalsList = [];
  if (vitals.bp) vitalsList.push(`B.P.: ${vitals.bp}`);
  if (vitals.pulse) vitalsList.push(`Pulse: ${vitals.pulse} bpm`);
  if (vitals.spo2) vitalsList.push(`SpO2: ${vitals.spo2}%`);
  if (vitals.temperature) vitalsList.push(`Temp: ${vitals.temperature}°F`);
  if (vitals.weight) vitalsList.push(`Weight: ${vitals.weight} kg`);
  if (vitals.height) vitalsList.push(`Height: ${vitals.height}`);
  if (vitals.blood_sugar) vitalsList.push(`Sugar: ${vitals.blood_sugar} mg/dL`);

  let currentY = 172;
  if (vitalsList.length > 0) {
    doc.rect(40, currentY, 515, 20).fill('#e0f2fe');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('Vitals: ', 48, currentY + 5);
    doc.font('Helvetica').fillColor(textColor).text(vitalsList.join('   |   '), 85, currentY + 5);
    currentY += 26;
  }

  // --- Rx SYMBOL & MEDICINES SECTION ---
  currentY += 6;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(accentColor).text('Rx', 40, currentY);
  currentY += 22;

  // Medicines Table Header
  doc.rect(40, currentY, 515, 20).fill(primaryColor);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
  doc.text('#', 46, currentY + 5);
  doc.text('Medicine & Potency', 65, currentY + 5);
  doc.text('Dosage & Frequency', 250, currentY + 5);
  doc.text('Duration', 390, currentY + 5);
  doc.text('Instructions & Timing', 450, currentY + 5);
  currentY += 20;

  // Medicine Rows
  doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
  const medicines = prescription.medicines || [];

  medicines.forEach((med, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.rect(40, currentY, 515, 24).fill('#f9fafb');
    }

    doc.fillColor(textColor);
    doc.font('Helvetica-Bold').text(String(idx + 1), 46, currentY + 6);

    const medNameText = med.potency ? `${med.name} (${med.potency})` : med.name;
    doc.font('Helvetica-Bold').text(medNameText, 65, currentY + 6, { width: 180 });

    const dosageText = [med.dosage, med.frequency].filter(Boolean).join(' - ') || '-';
    doc.font('Helvetica').text(dosageText, 250, currentY + 6, { width: 135 });

    doc.text(med.duration || '-', 390, currentY + 6, { width: 55 });

    const instructText = [med.instructions, med.foodTiming].filter(Boolean).join(' | ') || '-';
    doc.text(instructText, 450, currentY + 6, { width: 100 });

    currentY += 26;
  });

  // --- ADVICE & NOTES SECTION ---
  const advice = prescription.advice || {};
  if (advice.general || advice.diet_lifestyle || advice.next_visit || prescription.notes) {
    currentY += 10;
    doc.strokeColor(lineColor).lineWidth(1).moveTo(40, currentY).lineTo(555, currentY).stroke();
    currentY += 8;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('Advice & Instructions:', 40, currentY);
    currentY += 14;

    if (advice.general) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor).text('General: ', 40, currentY);
      doc.font('Helvetica').text(advice.general, 85, currentY, { width: 470 });
      currentY += 16;
    }

    if (advice.diet_lifestyle) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor).text('Diet / Lifestyle: ', 40, currentY);
      doc.font('Helvetica').text(advice.diet_lifestyle, 115, currentY, { width: 440 });
      currentY += 16;
    }

    if (advice.next_visit) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(accentColor).text('Next Visit / Follow-up: ', 40, currentY);
      doc.font('Helvetica').text(advice.next_visit, 140, currentY, { width: 410 });
      currentY += 16;
    }

    if (prescription.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor).text('Notes: ', 40, currentY);
      doc.font('Helvetica').text(prescription.notes, 75, currentY, { width: 480 });
      currentY += 16;
    }
  }

  // --- FOOTER & SIGNATURE ---
  const footerY = 740;
  doc.strokeColor(lineColor).lineWidth(0.8).moveTo(40, footerY).lineTo(555, footerY).stroke();

  // Signature Block
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('Dr. Parth Bhargava', 420, footerY + 8, { align: 'right', width: 135 });
  doc.font('Helvetica').fontSize(7.5).fillColor(mutedColor).text('Authorized Signature', 420, footerY + 20, { align: 'right', width: 135 });

  // Disclaimer
  doc.font('Helvetica').fontSize(7).fillColor(mutedColor);
  doc.text(
    'Disclaimer: Homoeopathic medicines are safe, gentle & effective. Please follow the dosage and instructions strictly. Not valid for medico-legal purposes.',
    40,
    footerY + 8,
    { width: 360 }
  );
  doc.text(
    'For emergency consultation / appointments, contact: +91 7668610031 | Visit: www.mdshomoeopathy.com',
    40,
    footerY + 24,
    { width: 360 }
  );

    doc.end();
  });
};
