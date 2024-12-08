import { z } from "zod";

// Schema for environment variables
const envSchema = z.object({
  GROQ_API_KEY: z.string(),
  UPSTASH_REDIS_REST_URL: z.string(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  RATE_LIMIT_SECRET: z.string(),
});

// Function to validate environment variables
const validateEnv = () => {
  try {
    const parsed = envSchema.parse({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET,
    });
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join("."));
      throw new Error(
        `❌ Invalid environment variables: ${missingVars.join(
          ", "
        )}. Please check your .env file`
      );
    }
    throw error;
  }
};

// Export validated environment variables
export const env = validateEnv();
