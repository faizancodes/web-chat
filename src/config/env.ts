import { z } from "zod";

// Schema for environment variables
const envSchema = z.object({
  GROQ_API_KEY: z.string(),
  REDIS_URL: z.string(),
  REDIS_TOKEN: z.string(),
});

// Function to validate environment variables
const validateEnv = () => {
  try {
    const parsed = envSchema.parse({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      REDIS_URL: process.env.REDIS_URL,
      REDIS_TOKEN: process.env.REDIS_TOKEN,
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
