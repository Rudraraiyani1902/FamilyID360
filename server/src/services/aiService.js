const {
  Family,
  FamilyMember,
  Scheme,
  SchemeRule,
  SchemeDocument,
  Application,
} = require('../models');
const { evaluateSchemes } = require('./eligibility.engine');

const INTENTS = {
  SCHEME_DISCOVERY: 'SCHEME_DISCOVERY',
  ELIGIBILITY_EXPLANATION: 'ELIGIBILITY_EXPLANATION',
  MISSING_DOCUMENTS: 'MISSING_DOCUMENTS',
  APPLICATION_STATUS: 'APPLICATION_STATUS',
  BENEFITS: 'BENEFITS',
  FAMILY_INFORMATION: 'FAMILY_INFORMATION',
  GENERAL_HELP: 'GENERAL_HELP',
};

const LANGUAGE_NAMES = { en: 'English', gu: 'Gujarati', hi: 'Hindi' };

const getLanguage = (message) => {
  if (/[\u0A80-\u0AFF]/u.test(message)) return 'gu';
  if (/[\u0900-\u097F]/u.test(message)) return 'hi';
  return 'en';
};

const detectIntent = (message) => {
  const normalized = message.toLowerCase();
  if (/(eligible|eligibility|eligible|પાત્ર|પાત્રતા|पात्र|पात्रता)/u.test(normalized)) return INTENTS.ELIGIBILITY_EXPLANATION;
  if (/(document|missing|upload|દસ્તાવેજ|बाकी|दस्तावेज)/u.test(normalized)) return INTENTS.MISSING_DOCUMENTS;
  if (/(application|applied|pending|status|आवेदन|स्थिति|અરજી|સ્થિતિ)/u.test(normalized)) return INTENTS.APPLICATION_STATUS;
  if (/(benefit|received|sanction|લાભ|મળેલ|लाभ|मिला)/u.test(normalized)) return INTENTS.BENEFITS;
  if (/(scheme|program|available|relevant|યોજના|યોજનાઓ|योजना|योजनाएं)/u.test(normalized)) return INTENTS.SCHEME_DISCOVERY;
  if (/(family|member|daughter|son|પરિવાર|સભ્ય|પરિવાર|सदस्य|परिवार)/u.test(normalized)) return INTENTS.FAMILY_INFORMATION;
  return INTENTS.GENERAL_HELP;
};

const resolveFamily = async (userId) => {
  let family = await Family.findOne({
    where: { createdBy: userId },
    include: [{ model: FamilyMember, as: 'members' }],
    order: [['createdAt', 'DESC']],
  });

  if (!family) {
    const member = await FamilyMember.findOne({ where: { userId }, attributes: ['familyId'] });
    if (member) {
      family = await Family.findByPk(member.familyId, {
        include: [{ model: FamilyMember, as: 'members' }],
      });
    }
  }
  return family;
};

const schemeInclude = [
  { model: SchemeRule, as: 'rules' },
  { model: SchemeDocument, as: 'documents' },
];

const findMentionedScheme = (message, schemes) => {
  const normalized = message.toLowerCase();
  return schemes.find((scheme) =>
    [scheme.code, scheme.name].filter(Boolean).some((value) => normalized.includes(value.toLowerCase()))
  );
};

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age -= 1;
  return age;
};

const buildSafeContext = ({ family, applications, schemes, eligibilityResults }) => ({
  family: family ? {
    annualIncome: family.annualIncome,
    district: family.district,
    villageCity: family.villageCity,
    verificationStatus: family.verificationStatus,
  } : null,
  members: (family?.members || []).map((member) => ({
    relationToHead: member.relationToHead,
    age: calculateAge(member.dateOfBirth),
    gender: member.gender,
    educationLevel: member.educationLevel,
    disabilityStatus: member.disabilityStatus,
    isFamilyHead: member.isFamilyHead,
  })),
  schemes: (schemes || []).map((scheme) => ({
    id: scheme.id,
    code: scheme.code,
    name: scheme.name,
    department: scheme.department,
    benefit: scheme.benefit,
    description: scheme.description,
    documents: (scheme.documents || []).filter((document) => document.isRequired).map((document) => document.documentType),
  })),
  applications: (applications || []).map((application) => ({
    applicationId: application.applicationId,
    status: application.status,
    submittedDate: application.createdAt,
    lastUpdated: application.updatedAt,
    schemeName: application.scheme?.name || null,
    missingDocuments: application.missingDocuments || [],
    benefit: application.benefit || application.scheme?.benefit || null,
  })),
  eligibility: (eligibilityResults || []).map((result) => ({
    schemeId: result.schemeId,
    schemeCode: result.schemeCode,
    schemeName: result.schemeName,
    outcome: result.outcome,
    benefit: result.benefit,
    satisfiedConditions: (result.satisfiedRules || []).map((rule) => ({ fieldName: rule.fieldName, values: rule.values })),
    failedConditions: (result.failedConditions || []).map((rule) => ({ fieldName: rule.fieldName, reason: rule.reason, values: rule.values })),
    missingConditions: (result.missingConditions || []).map((rule) => ({ fieldName: rule.fieldName, reason: rule.reason })),
    missingDocuments: result.missingDocuments || [],
  })),
});

const getProvider = () => {
  if (process.env.AI_PROVIDER !== 'openai_compatible' || !process.env.AI_API_KEY || !process.env.AI_API_URL) return null;
  return {
    async complete({ language, intent, question, context }) {
      const endpoint = process.env.AI_API_URL.replace(/\/$/, '').endsWith('/chat/completions')
        ? process.env.AI_API_URL
        : `${process.env.AI_API_URL.replace(/\/$/, '')}/chat/completions`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL,
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: `You are FamilyID Assistant. Reply in ${LANGUAGE_NAMES[language]}. Use only the verified JSON context provided by the backend. Never invent schemes, eligibility criteria, documents, policies, benefits, or application statuses. Never expose identifiers or personal information not present in the context. Never modify family or application data. If the context does not answer the question, say: "I don't have enough verified information to answer that." Explain eligibility outcomes; do not calculate or override them. The current intent is ${intent}.`,
            },
            { role: 'user', content: `Question: ${question}\nVerified context:\n${JSON.stringify(context)}` },
          ],
        }),
      });
      if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
      const payload = await response.json();
      return payload.choices?.[0]?.message?.content?.trim() || null;
    },
  };
};

const fallbackResponse = ({ language, intent, context }) => {
  const results = context.eligibility || [];
  const eligibilitySummary = results.map((result) => {
    const failed = result.failedConditions.map((condition) => `${condition.fieldName}: ${condition.reason}`).join('; ');
    const missing = result.missingConditions.map((condition) => `${condition.fieldName}: ${condition.reason}`).join('; ');
    const documents = result.missingDocuments.map((document) => document.documentType).join(', ');
    const reasons = [failed, missing].filter(Boolean).join('; ');
    return `${result.schemeName}: ${result.outcome}${reasons ? ` (${reasons})` : ''}${documents ? `; documents not recorded as supplied: ${documents}` : ''}`;
  });
  const schemeSummary = results.map((result) => `${result.schemeName}: ${result.outcome}`).join('; ');
  if (language === 'gu') {
    if (intent === INTENTS.MISSING_DOCUMENTS) return results.length ? `બેકએન્ડ મુજબ જરૂરી બાકી દસ્તાવેજો: ${results.flatMap((item) => item.missingDocuments.map((document) => document.documentType)).join(', ') || 'કોઈ નહીં'}.` : 'તમારા પરિવાર માટે ચકાસાયેલ દસ્તાવેજ માહિતી ઉપલબ્ધ નથી.';
    if (intent === INTENTS.APPLICATION_STATUS) return context.applications.length ? `તમારી અરજીઓ: ${context.applications.map((item) => `${item.applicationId} - ${item.schemeName || 'યોજના'}: ${item.status}`).join('; ')}.` : 'તમારી કોઈ અરજી મળી નથી.';
    if (intent === INTENTS.BENEFITS) return `મંજૂર થયેલા લાભોની સંખ્યા: ${context.applications.filter((item) => item.status === 'APPROVED').length}.`;
    if (intent === INTENTS.ELIGIBILITY_EXPLANATION || intent === INTENTS.SCHEME_DISCOVERY) return results.length ? `સિસ્ટમ મુજબના પરિણામો: ${schemeSummary}.` : 'ચકાસાયેલ પાત્રતા માહિતી ઉપલબ્ધ નથી.';
    return 'હું તમારા પરિવાર, યોજનાઓ, પાત્રતા, દસ્તાવેજો અને અરજીઓ વિશે ચકાસાયેલ માહિતી સમજાવી શકું છું.';
  }
  if (language === 'hi') {
    if (intent === INTENTS.MISSING_DOCUMENTS) return results.length ? `बैकएंड के अनुसार आवश्यक दस्तावेज़: ${results.flatMap((item) => item.missingDocuments.map((document) => document.documentType)).join(', ') || 'कोई नहीं'}।` : 'आपके परिवार के लिए सत्यापित दस्तावेज़ जानकारी उपलब्ध नहीं है।';
    if (intent === INTENTS.APPLICATION_STATUS) return context.applications.length ? `आपके आवेदन: ${context.applications.map((item) => `${item.applicationId} - ${item.schemeName || 'योजना'}: ${item.status}`).join('; ')}।` : 'आपका कोई आवेदन नहीं मिला।';
    if (intent === INTENTS.BENEFITS) return `स्वीकृत लाभों की संख्या: ${context.applications.filter((item) => item.status === 'APPROVED').length}।`;
    if (intent === INTENTS.ELIGIBILITY_EXPLANATION || intent === INTENTS.SCHEME_DISCOVERY) return results.length ? `सिस्टम के अनुसार परिणाम: ${schemeSummary}।` : 'सत्यापित पात्रता जानकारी उपलब्ध नहीं है।';
    return 'मैं आपके परिवार, योजनाओं, पात्रता, दस्तावेज़ और आवेदनों की सत्यापित जानकारी समझा सकता हूँ।';
  }
  if (intent === INTENTS.MISSING_DOCUMENTS) return results.length ? `According to the eligibility engine, required documents are: ${results.flatMap((item) => item.missingDocuments.map((document) => document.documentType)).join(', ') || 'none listed'}.` : 'Verified document information is unavailable for your family.';
  if (intent === INTENTS.APPLICATION_STATUS) return context.applications.length ? `Your applications: ${context.applications.map((item) => `${item.applicationId} - ${item.schemeName || 'scheme'}: ${item.status}`).join('; ')}.` : 'No applications were found for your family.';
  if (intent === INTENTS.BENEFITS) return `The backend shows ${context.applications.filter((item) => item.status === 'APPROVED').length} approved application(s).`;
  if (intent === INTENTS.ELIGIBILITY_EXPLANATION || intent === INTENTS.SCHEME_DISCOVERY) return results.length ? `Verified eligibility results: ${eligibilitySummary.join(' | ')}.` : 'Verified eligibility information is unavailable.';
  if (intent === INTENTS.FAMILY_INFORMATION) return context.family ? `Your family profile is under ${context.family.verificationStatus || 'unavailable'} verification, with ${context.members.length} member(s) recorded.` : 'Your family profile is unavailable.';
  return 'I can explain verified information about your family, schemes, eligibility, documents, and applications.';
};

const answerQuestion = async ({ userId, question }) => {
  const intent = detectIntent(question);
  const language = getLanguage(question);
  const family = await resolveFamily(userId);
  if (!family) {
    return { message: language === 'en' ? 'I could not find a family profile for your account.' : language === 'gu' ? 'તમારા ખાતા માટે પરિવાર પ્રોફાઇલ મળી નથી.' : 'आपके खाते के लिए परिवार प्रोफ़ाइल नहीं मिली।', intent, sources: [] };
  }

  const [applications, schemes] = await Promise.all([
    Application.findAll({
      where: { familyId: family.id },
      include: [{ model: Scheme, as: 'scheme', attributes: ['id', 'code', 'name', 'benefit'] }],
      order: [['createdAt', 'DESC']],
    }),
    Scheme.findAll({ where: { status: 'active' }, include: schemeInclude, order: [['code', 'ASC']] }),
  ]);

  const mentionedScheme = findMentionedScheme(question, schemes);
  let eligibilityResults = [];
  if ([INTENTS.SCHEME_DISCOVERY, INTENTS.ELIGIBILITY_EXPLANATION, INTENTS.MISSING_DOCUMENTS].includes(intent)) {
    const selectedSchemes = mentionedScheme ? [mentionedScheme] : schemes;
    eligibilityResults = evaluateSchemes({
      family: family.toJSON(),
      members: (family.members || []).map((member) => member.toJSON()),
      schemes: selectedSchemes.map((scheme) => scheme.toJSON()),
      documents: [],
    });
  }

  const context = buildSafeContext({ family: family.toJSON(), applications, schemes: mentionedScheme ? [mentionedScheme] : schemes, eligibilityResults });
  const provider = getProvider();
  let message;
  const providerIntents = [INTENTS.SCHEME_DISCOVERY, INTENTS.ELIGIBILITY_EXPLANATION, INTENTS.MISSING_DOCUMENTS];
  if (provider && providerIntents.includes(intent)) {
    try {
      message = await provider.complete({ language, intent, question, context });
    } catch (error) {
      console.error('AI provider unavailable; using verified fallback:', error.message);
    }
  }
  message = message || fallbackResponse({ language, intent, context });

  return {
    message,
    intent,
    sources: eligibilityResults.map((result) => ({ type: 'eligibility', schemeId: result.schemeId, schemeCode: result.schemeCode })),
  };
};

module.exports = { INTENTS, detectIntent, answerQuestion, buildSafeContext };