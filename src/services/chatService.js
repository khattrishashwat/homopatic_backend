const SiteSettings = require('../models/SiteSettings');
const ChatbotQuestion = require('../models/ChatbotQuestion');

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'between', 'into',
  'through', 'during', 'before', 'after', 'from', 'up', 'down', 'over', 'under',
  'then', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should',
  'now', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'she', 'her',
  'hers', 'it', 'its', 'they', 'them', 'their', 'theirs', 'what', 'which',
  'who', 'whom', 'this', 'that', 'these', 'those', 'do', 'does', 'did', 'have',
  'has', 'had', 'please', 'tell', 'want', 'know', 'give',
]);

/**
 * Normalize text: lowercase, canonicalize common health terms, remove special punctuation
 */
function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/homoeopath(y|ic)/g, 'homeopath$1')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize string into meaningful words, stripping stop-words
 */
function tokenize(str) {
  const norm = normalizeText(str);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Check if two tokens are similar (exact or share a significant prefix/stem)
 */
function isTokenMatch(t1, t2) {
  if (t1 === t2) return true;
  if (t1.length >= 4 && t2.length >= 4) {
    if (t1.startsWith(t2) || t2.startsWith(t1)) return true;
    // Common suffix checks (e.g. treat / treatment, consult / consultation)
    const stem1 = t1.replace(/(ing|ment|tion|s|ed|es)$/, '');
    const stem2 = t2.replace(/(ing|ment|tion|s|ed|es)$/, '');
    if (stem1.length >= 3 && stem1 === stem2) return true;
  }
  return false;
}

/**
 * Score relevance between a user input and a candidate ChatbotQuestion record
 */
function calculateMatchScore(userRaw, candidate) {
  const userNorm = normalizeText(userRaw);
  const qNorm = normalizeText(candidate.question);

  if (!userNorm || !qNorm) return 0;

  // 1. Exact or near-exact match
  if (userNorm === qNorm) return 1.0;

  // 2. Substring match (either user query inside candidate or candidate inside user)
  if (userNorm.length > 8 && qNorm.includes(userNorm)) {
    return 0.85;
  }
  if (qNorm.length > 8 && userNorm.includes(qNorm)) {
    return 0.85;
  }

  let score = 0;
  const userTokens = tokenize(userRaw);
  const qTokens = tokenize(candidate.question);

  if (userTokens.length === 0) return 0;

  // 3. Keyword matching (from Admin-configured keywords)
  const candidateKeywords = Array.isArray(candidate.keywords) ? candidate.keywords : [];
  let keywordMatches = 0;

  for (const kw of candidateKeywords) {
    const kwNorm = normalizeText(kw);
    if (!kwNorm) continue;

    // Check if the entire keyword phrase is present in the user normalized text
    if (userNorm.includes(kwNorm)) {
      keywordMatches++;
      score += 0.4;
    } else {
      // Check token match
      const kwTokens = tokenize(kw);
      if (kwTokens.length > 0 && kwTokens.every((kt) => userTokens.some((ut) => isTokenMatch(kt, ut)))) {
        keywordMatches++;
        score += 0.3;
      }
    }
  }

  // 4. Token overlap calculation between query and question
  let matchedTokensCount = 0;
  for (const uTok of userTokens) {
    if (qTokens.some((qTok) => isTokenMatch(uTok, qTok))) {
      matchedTokensCount++;
    }
  }

  if (qTokens.length > 0) {
    const userCoverage = matchedTokensCount / userTokens.length;
    const questionCoverage = matchedTokensCount / qTokens.length;
    // Jaccard-like overlap
    const unionSize = new Set([...userTokens, ...qTokens]).size;
    const jaccard = unionSize > 0 ? matchedTokensCount / unionSize : 0;

    const tokenScore = (userCoverage * 0.4) + (questionCoverage * 0.3) + (jaccard * 0.3);
    score += tokenScore;
  }

  return score;
}

/**
 * Get dynamic Chatbot configuration for website and admin
 */
exports.getConfig = async () => {
  let settings = null;
  try {
    settings = await SiteSettings.findOne().select('chatbot_settings phone site_name').lean();
  } catch (err) {
    console.error('Error fetching chatbot settings:', err.message);
  }

  const chatbot = settings?.chatbot_settings || {};
  let suggestedQuestions = Array.isArray(chatbot.suggested_questions)
    ? chatbot.suggested_questions.filter(Boolean)
    : [];

  // If no suggested questions configured in SiteSettings, pull from active ChatbotQuestions
  if (suggestedQuestions.length === 0) {
    try {
      const topQuestions = await ChatbotQuestion.find({ active: true })
        .sort({ order: 1, createdAt: -1 })
        .limit(5)
        .select('question')
        .lean();
      suggestedQuestions = topQuestions.map((q) => q.question);
    } catch (err) {
      console.error('Error fetching fallback suggested questions from DB:', err.message);
    }
  }

  const welcomeMessage =
    chatbot.welcome_message ||
    "Hi! 👋 Welcome to MD's Homoeopathy. How can I assist your health journey today?";

  return {
    enabled: chatbot.enabled !== false,
    welcome_message: welcomeMessage,
    welcomeMessage: welcomeMessage, // contract compatibility
    suggested_questions: suggestedQuestions,
    suggestedQuestions: suggestedQuestions, // contract compatibility
    phone: settings?.phone || '+91 7668610031',
    siteName: settings?.site_name || "MD's Homoeopathy",
  };
};

/**
 * Generate chatbot reply using dynamic database-driven Question & Answer matching
 */
exports.generateReply = async (userMessage, sessionId) => {
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('Message is required');
  }

  const cleaned = userMessage.trim();
  const normalized = normalizeText(cleaned);

  // Fetch dynamic suggestions to return alongside reply
  const config = await exports.getConfig();
  const suggestions = config.suggested_questions.slice(0, 4);

  // 1. Check greetings
  if (/^(hi|hello|hey|namaste|greetings|good morning|good evening|good afternoon)\b/i.test(normalized)) {
    return {
      reply: config.welcome_message,
      suggestions,
      sessionId: sessionId || 'default',
    };
  }

  // 2. Fetch all active Chatbot Questions from database
  let activeQuestions = [];
  try {
    activeQuestions = await ChatbotQuestion.find({ active: true })
      .select('question answer keywords order')
      .lean();
  } catch (err) {
    console.error('Error querying active chatbot questions:', err.message);
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const candidate of activeQuestions) {
    const score = calculateMatchScore(cleaned, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  // 3. If best match meets confidence threshold (>= 0.35)
  if (bestMatch && bestScore >= 0.35) {
    // Generate contextual suggestions: other active questions
    const nextSuggestions = activeQuestions
      .filter((q) => q._id.toString() !== bestMatch._id.toString())
      .slice(0, 3)
      .map((q) => q.question);

    return {
      reply: bestMatch.answer,
      suggestions: nextSuggestions.length > 0 ? nextSuggestions : suggestions,
      sessionId: sessionId || 'default',
    };
  }

  // 4. Generic Fallback response (without hardcoded medical/business claims)
  const phoneText = config.phone ? ` directly at ${config.phone}` : '';
  const fallbackReply =
    `Thank you for your message! For personalized health advice or specific inquiries, please feel free to book a consultation online or contact our clinic team${phoneText}. You can also explore the questions below.`;

  return {
    reply: fallbackReply,
    suggestions,
    sessionId: sessionId || 'default',
  };
};

exports.calculateMatchScore = calculateMatchScore;
exports.normalizeText = normalizeText;
exports.tokenize = tokenize;
