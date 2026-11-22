const { z } = require('zod');

const NATIONAL_ID_RE = /^\d{12}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PAYOUT_ACCOUNT_RE = /^\d{9,18}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UAN_RE = /^\d{12}$/;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const TRADES = ['Mason', 'Electrician', 'Plumber', 'Carpenter', 'General Helper'];
const GENDERS = ['Male', 'Female', 'Other'];
const LANGUAGES = ['hi-IN', 'en-IN', 'hinglish'];

const objectIdString = (label = 'Invalid id') => z.string().regex(OBJECT_ID_RE, label);

// Individual laborer field definitions (shared by laborer, contractor, profile and worker schemas)
const laborerFields = {
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  phone: z.string().regex(PHONE_RE, 'Phone must be a valid 10-digit mobile number starting with 6-9'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
  age: z.number().int('Age must be a whole number').min(18, 'Age must be at least 18').max(75, 'Age must be at most 75'),
  gender: z.enum(GENDERS, 'Gender must be Male, Female or Other'),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  trade: z.enum(TRADES, 'Trade is not a recognised option'),
  monthlyIncome: z.number().min(0, 'Monthly income cannot be negative'),
  bocwRegistered: z.boolean().optional(),
  nationalId: z.string().regex(NATIONAL_ID_RE, 'National ID must be exactly 12 digits').optional(),
  payoutAccount: z.string().regex(PAYOUT_ACCOUNT_RE, 'Payout account must be 9 to 18 digits').optional(),
  ifscCode: z.string().regex(IFSC_RE, 'IFSC must be 11 characters: 4 letters, 0, then 6 alphanumerics').optional(),
  uan: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().regex(UAN_RE, 'UAN must be exactly 12 digits').optional()
  ),
};

const pickFields = (shape, keys) => Object.fromEntries(keys.map((key) => [key, shape[key]]));
const makeOptional = (shape, keys) => Object.fromEntries(keys.map((key) => [key, shape[key].optional()]));

const identityKeys = ['name', 'phone', 'password', 'state', 'district'];
const detailKeys = ['age', 'gender', 'trade', 'monthlyIncome', 'bocwRegistered', 'nationalId', 'payoutAccount', 'ifscCode', 'uan'];

const registerLaborerSchema = z.object(laborerFields);

const registerContractorSchema = z.object({
  ...pickFields(laborerFields, identityKeys),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(150, 'Company name must be at most 150 characters'),
  ...makeOptional(laborerFields, detailKeys),
});

const loginSchema = z.object({
  phone: z.string().regex(PHONE_RE, 'Phone must be a valid 10-digit mobile number starting with 6-9'),
  password: z.string().min(1, 'Password is required'),
});

// Strictly partial: every key is optional and no key carries a .default(), so an omitted
// field stays absent after parsing instead of being filled in (e.g. bocwRegistered reset to false).
// Password is not a profile field and is excluded.
const { password: _omittedPassword, ...profileFieldShape } = laborerFields;
const profileUpdateSchema = z
  .object(profileFieldShape)
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

const workerCreateSchema = registerLaborerSchema;

const applyDocumentUpdateSchema = z.object({
  documentName: z.string().min(1, 'Document name is required').max(200, 'Document name must be at most 200 characters'),
  status: z.enum(['pending', 'uploaded', 'verified'], 'Status must be pending, uploaded or verified'),
});

const bulkEnrollSchema = z.object({
  schemeId: objectIdString('schemeId must be a valid id'),
  laborerIds: z
    .array(objectIdString('Each laborerId must be a valid id'))
    .min(1, 'At least one laborerId is required')
    .max(500, 'At most 500 laborerIds are allowed'),
});

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be at most 2000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant'], 'History role must be user or assistant'),
        content: z.string().max(4000, 'History content must be at most 4000 characters'),
      })
    )
    .max(20, 'History can contain at most 20 entries')
    .optional(),
});

const voiceSchema = z.object({
  audio_base64: z.string().min(1, 'audio_base64 is required'),
  language: z.enum(LANGUAGES, 'Language must be hi-IN, en-IN or hinglish').default('hi-IN'),
  tts: z.boolean().default(false),
});

const objectIdParamSchema = z.object({
  id: objectIdString('Invalid id'),
});

const schemeIdParamSchema = z.object({
  schemeId: objectIdString('Invalid schemeId'),
});

const isValidObjectId = (value) => OBJECT_ID_RE.test(String(value));

// Express middleware factory: validates req[source] and replaces it with parsed data.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_root';
        if (!(key in fields)) {
          fields[key] = issue.message;
        }
      }
      return res.status(400).json({ success: false, error: 'Validation failed', fields });
    }
    // Express 5 exposes req.query as a getter, so it must be redefined rather than assigned.
    if (source === 'query') {
      Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true, enumerable: true });
    } else {
      req[source] = result.data;
    }
    return next();
  };
}

module.exports = {
  NATIONAL_ID_RE,
  PHONE_RE,
  PAYOUT_ACCOUNT_RE,
  IFSC_RE,
  UAN_RE,
  OBJECT_ID_RE,
  TRADES,
  GENDERS,
  LANGUAGES,
  registerLaborerSchema,
  registerContractorSchema,
  loginSchema,
  profileUpdateSchema,
  workerCreateSchema,
  applyDocumentUpdateSchema,
  bulkEnrollSchema,
  chatSchema,
  voiceSchema,
  objectIdParamSchema,
  schemeIdParamSchema,
  isValidObjectId,
  validate,
};
