import { z } from "zod";

// Schema for environment variables
const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
});

// Function to validate environment variables
const validateEnv = () => {
  try {
    const parsed = envSchema.parse({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
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
