const SiteSettings = require('../models/SiteSettings');

const DEFAULT_WELCOME =
  "Hi! 👋 Welcome to MD's Homoeopathy. I'm your digital wellness assistant. How can I help you today?";

const DEFAULT_SUGGESTIONS = [
  "How long does homeopathic treatment take?",
  "What conditions do you treat?",
  "How to book an appointment?",
  "Do you offer online consultation & delivery?",
  "Are there any side effects?",
];

const KNOWLEDGE_BASE = [
  {
    triggers: [
      'duration', 'how long', 'time taken', 'how much time', 'timeline', 'recover',
      'cure time', 'course',
    ],
    answer:
      "Homeopathic treatment duration depends on whether the condition is acute or chronic, its severity, and individual constitutional response. Acute conditions often improve within days, while chronic conditions (such as PCOD, Thyroid, Psoriasis, or Arthritis) typically take 3 to 6 months of systematic treatment to eliminate the root cause. Your doctor provides a personalized timeline during consultation.",
    suggestions: ['How to book an appointment?', 'Do you deliver medicines?'],
  },
  {
    triggers: [
      'condition', 'treat', 'specialty', 'disease', 'problem', 'what do you treat',
      'pcod', 'pcos', 'thyroid', 'hair', 'skin', 'psoriasis', 'eczema', 'joint', 'pain',
      'asthma', 'allergy', 'child', 'migraine', 'acne',
    ],
    answer:
      "MD's Homoeopathy provides specialized care across 16 medical departments, including:\n• Hair & Scalp (Hair Fall, Alopecia, Dandruff)\n• Skin Disorders (Psoriasis, Eczema, Vitiligo, Acne)\n• Women's Health (PCOS/PCOD, Hormonal Imbalance, Infertility)\n• Thyroid & Endocrine Health\n• Bone & Joint Care (Arthritis, Cervical, Sciatica)\n• Respiratory & Allergies (Asthma, Sinusitis)\n• Pediatric & Child Immunity\n• Digestive & Gastrointestinal Disorders",
    suggestions: ['How to book an appointment?', 'Are treatments side-effect free?'],
  },
  {
    triggers: [
      'book', 'appointment', 'slot', 'consult', 'doctor', 'schedule', 'fee', 'charge', 'cost',
    ],
    answer:
      "You can book an in-clinic or online video consultation easily:\n1. Click 'Book Appointment' on the website (/appointment).\n2. Select your preferred date, available time slot, and consultation mode.\n3. Fill in your details and confirm.\n\nYou can also book directly via WhatsApp at +91 76686 10031. Online consultation charges range from ₹200 to ₹500.",
    suggestions: ['Do you offer online consultation & delivery?', 'Who is the doctor?'],
  },
  {
    triggers: [
      'online', 'video', 'delivery', 'courier', 'shipping', 'home delivery', 'remote',
      'distance', 'doorstep', 'other city', 'state',
    ],
    answer:
      "Yes! We offer secure online video consultations for patients across India and globally. After your detailed consultation, customized homeopathic medicines are carefully packed and dispatched via express courier, reaching your doorstep within 2 to 4 business days.",
    suggestions: ['How to book an appointment?', 'What conditions do you treat?'],
  },
  {
    triggers: [
      'side effect', 'safe', 'natural', 'chemical', 'steroid', 'harmful', 'pregnant', 'children',
      'kids', 'elderly',
    ],
    answer:
      "Homeopathy is 100% natural, gentle, non-toxic, and free from adverse side effects when prescribed by a qualified physician. Our medicines contain no harmful chemicals or steroids and are completely safe for infants, children, adults, pregnant women, and elderly patients.",
    suggestions: ['How long does homeopathic treatment take?', 'Who is the doctor?'],
  },
  {
    triggers: [
      'doctor', 'parth', 'gaurav', 'bhargava', 'founder', 'qualification', 'bhms', 'experience', 'who is',
    ],
    answer:
      "MD's Homoeopathy is led by Dr. Parth Bhargava (BHMS, Homoeopathic Consultant & R&D Cell member) with over 5+ years of clinical excellence and 5000+ patients healed, alongside Senior Consultant Dr. Gaurav Bhargava (Head – R&D Cell) and Director Mrs. Kirti Bhargava.",
    suggestions: ['How to book an appointment?', 'Where is the clinic located?'],
  },
  {
    triggers: [
      'product', 'br oil', 'scalp vital', 'oil', 'spray', 'medicine', 'shop', 'buy', 'cream',
    ],
    answer:
      "We formulate specialized doctor-crafted remedies available in our Shop (/shop):\n• BR Oil (₹399) — Natural homeopathic arthritic oil for relief from joint pain, stiffness, and improved mobility.\n• Scalp Vital Spray (₹499) — Formulated to eliminate dandruff, restore moisture, and strengthen hair roots naturally.\n\nAll remedies are available for direct order on our website.",
    suggestions: ['How to book an appointment?', 'Where is the clinic located?'],
  },
  {
    triggers: [
      'location', 'address', 'where', 'clinic', 'mathura', 'contact', 'phone', 'number', 'email', 'timing', 'hours',
    ],
    answer:
      "MD's Homoeopathy Clinic details:\n• Address: 1262/3A, Deeg Gali, Shahganj Darwaza, Mathura, Uttar Pradesh – 281001, India\n• Phone / WhatsApp: +91 76686 10031\n• Email: mdshomoeopathy13@gmail.com\n• Business Hours: Monday – Saturday (9:00 AM – 8:00 PM), Sunday (10:00 AM – 2:00 PM)\n• Online video consultations available across all states.",
    suggestions: ['How to book an appointment?', 'What conditions do you treat?'],
  },
];

exports.getConfig = async () => {
  let settings = null;
  try {
    settings = await SiteSettings.findOne().select('chatbot_settings phone site_name');
  } catch (err) {
    console.error('Error fetching chatbot settings:', err.message);
  }

  const chatbot = settings?.chatbot_settings || {};
  return {
    enabled: chatbot.enabled !== false,
    welcomeMessage: chatbot.welcome_message || DEFAULT_WELCOME,
    suggestedQuestions:
      Array.isArray(chatbot.suggested_questions) && chatbot.suggested_questions.length > 0
        ? chatbot.suggested_questions
        : DEFAULT_SUGGESTIONS,
    phone: settings?.phone || '+91 7668610031',
    siteName: settings?.site_name || "MD's Homoeopathy",
  };
};

exports.generateReply = async (userMessage, sessionId) => {
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('Message is required');
  }

  const cleaned = userMessage.trim().toLowerCase();

  // 1. Keyword / Knowledge Base Intent Matching
  for (const item of KNOWLEDGE_BASE) {
    const matched = item.triggers.some((trigger) => cleaned.includes(trigger));
    if (matched) {
      return {
        reply: item.answer,
        suggestions: item.suggestions || DEFAULT_SUGGESTIONS.slice(0, 3),
        sessionId: sessionId || 'default',
      };
    }
  }

  // 2. Greetings
  if (/^(hi|hello|hey|namaste|good morning|good evening|good afternoon)\b/i.test(cleaned)) {
    return {
      reply:
        "Hello! 👋 Welcome to MD's Homoeopathy. I can assist you with understanding treatments, booking doctor appointments, purchasing clinic remedies, or learning more about our natural healing methods. How can I help you today?",
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 3),
      sessionId: sessionId || 'default',
    };
  }

  // 3. Fallback response with helpful guidance
  return {
    reply:
      "Thank you for your question! At MD's Homoeopathy, we offer personalized, safe, and root-cause homeopathic care for chronic and acute health issues. For detailed personalized advice, you can book a consultation with Dr. Parth Bhargava online, or connect directly with our clinic team on WhatsApp at +91 76686 10031.",
    suggestions: [
      'How to book an appointment?',
      'What conditions do you treat?',
      'Where is the clinic located?',
    ],
    sessionId: sessionId || 'default',
  };
};
