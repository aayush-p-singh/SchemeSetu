require('dotenv').config();
const { z } = require('zod');

const optionalString = z.string().optional().default('');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  SARVAM_API_URL: z.string().default('https://api.sarvam.ai'),
  SARVAM_API_KEY: optionalString,
  GNANI_API_KEY: optionalString,
  GNANI_STT_URL: z.string().default('https://api.vachana.ai/stt/v3'),
  GNANI_TTS_URL: z.string().default('https://api.vachana.ai/api/v1/tts/inference'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const failingKeys = [...new Set(result.error.issues.map((issue) => issue.path.join('.') || '_root'))];
  console.error(`Invalid or missing environment variables: ${failingKeys.join(', ')}`);
  process.exit(1);
}

module.exports = result.data;
