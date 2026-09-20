const OUTCOMES = {
  ELIGIBLE: 'ELIGIBLE',
  POTENTIALLY_ELIGIBLE: 'POTENTIALLY_ELIGIBLE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
};

const isMissing = (value) =>
  value === undefined || value === null || value === '';

const getAge = (dateOfBirth) => {
  if (!dateOfBirth) return undefined;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate());

  if (beforeBirthday) age -= 1;
  return age;
};

const getPath = (object, path) =>
  path.split('.').reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, object);

const resolveValues = (fieldName, family, members) => {
  const normalizedField = fieldName.replace(/^family\./, '');

  if (normalizedField.startsWith('member.')) {
    const memberField = normalizedField.replace(/^member\./, '');

    return members.map((member) => {
      const value = getPath(member, memberField);
      return memberField === 'age' ? getAge(member.dateOfBirth) : value;
    });
  }

  if (normalizedField.startsWith('members.')) {
    const memberField = normalizedField.replace(/^members\./, '');

    return members.map((member) => {
      const value = getPath(member, memberField);
      return memberField === 'age' ? getAge(member.dateOfBirth) : value;
    });
  }

  if (normalizedField === 'age') {
    return members.map((member) => getAge(member.dateOfBirth));
  }

  return [getPath(family, normalizedField)];
};

const compare = (actual, operator, expected) => {
  switch (operator) {
    case 'equals':
      return actual === expected;

    case 'not_equals':
      return actual !== expected;

    case 'less_than':
      return Number(actual) < Number(expected);

    case 'less_than_or_equal':
      return Number(actual) <= Number(expected);

    case 'greater_than':
      return Number(actual) > Number(expected);

    case 'greater_than_or_equal':
      return Number(actual) >= Number(expected);

    case 'in':
      return Array.isArray(expected) && expected.includes(actual);

    case 'not_in':
      return Array.isArray(expected) && !expected.includes(actual);

    default:
      throw new Error(`Unsupported rule operator: ${operator}`);
  }
};

const evaluateRule = (rule, family, members) => {
  const values = resolveValues(rule.fieldName, family, members);
  const expected = rule.value;

  if (values.every(isMissing)) {
    return {
      status: 'missing',
      reason: `Missing value for ${rule.fieldName}`,
      values: [],
    };
  }

  const validValues = values.filter((value) => !isMissing(value));
  const satisfied = validValues.some((value) =>
    compare(value, rule.operator, expected)
  );

  return {
    status: satisfied ? 'satisfied' : 'failed',
    reason: satisfied
      ? null
      : `${rule.fieldName} does not satisfy ${rule.operator}`,
    values: validValues,
  };
};

const normalizeDocuments = (documents = []) =>
  new Set(
    documents.map((document) =>
      typeof document === 'string' ? document : document.documentType
    )
  );

const evaluateScheme = ({
  family,
  members = [],
  scheme,
  documents = [],
}) => {
  const satisfiedRules = [];
  const failedConditions = [];
  const missingConditions = [];

  const rules = scheme.rules || [];

  for (const rule of rules) {
    const result = evaluateRule(rule, family, members);

    const ruleResult = {
      ruleId: rule.id,
      ruleType: rule.ruleType,
      fieldName: rule.fieldName,
      operator: rule.operator,
      expectedValue: rule.value,
      groupKey: rule.groupKey,
      values: result.values,
      reason: result.reason,
    };

    if (result.status === 'satisfied') {
      satisfiedRules.push(ruleResult);
    } else if (result.status === 'missing') {
      missingConditions.push(ruleResult);
    } else {
      failedConditions.push(ruleResult);
    }
  }

  const suppliedDocuments = normalizeDocuments(documents);
  const requiredDocuments = (scheme.documents || []).filter(
    (document) => document.isRequired
  );

  const missingDocuments = requiredDocuments
    .filter((document) => !suppliedDocuments.has(document.documentType))
    .map((document) => ({
      documentId: document.id,
      documentType: document.documentType,
    }));

  let outcome = OUTCOMES.ELIGIBLE;

  if (failedConditions.length > 0) {
    outcome = OUTCOMES.NOT_ELIGIBLE;
  } else if (
    missingConditions.length > 0 ||
    missingDocuments.length > 0
  ) {
    outcome = OUTCOMES.POTENTIALLY_ELIGIBLE;
  }

  return {
    schemeId: scheme.id,
    schemeCode: scheme.code,
    schemeName: scheme.name,
    outcome,
    satisfiedRules,
    failedConditions,
    missingConditions,
    missingDocuments,
  };
};

const evaluateSchemes = ({
  family,
  members = [],
  schemes = [],
  documents = [],
}) =>
  schemes.map((scheme) =>
    evaluateScheme({
      family,
      members,
      scheme,
      documents: documents.filter(
        (document) => document.schemeId === scheme.id
      ),
    })
  );

module.exports = {
  OUTCOMES,
  evaluateScheme,
  evaluateSchemes,
};