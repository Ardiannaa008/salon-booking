import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3000),
    ADMIN_PASSWORD: z.string().min(8),

    EMAIL_PROVIDER: z.enum(['resend', 'fake']).default('resend'),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().min(1).default('Studio Luna <onboarding@resend.dev>'),
    EMAIL_MAX_RETRIES: z.coerce.number().int().min(3).default(3),
    EMAIL_RETRY_DELAYS_SECONDS: z
      .string()
      .default('60,300,900')
      .transform((value) => value.split(',').map(Number))
      .pipe(z.array(z.number().int().nonnegative()).min(1)),
    FAKE_EMAIL_FAIL_ATTEMPTS: z.coerce.number().int().nonnegative().default(0),

    START_WORKER: booleanString.default(true),
    WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),

    SALON_NAME: z.string().min(1).default('Studio Luna'),
    SALON_TIMEZONE: z.string().min(1).default('Europe/Berlin'),
    BOOKING_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    CLIENT_IP_HEADER: z.string().optional(),
    // Render sets this on every service.
    RENDER: z.string().optional(),
  })
  .refine((env) => env.EMAIL_PROVIDER !== 'resend' || Boolean(env.RESEND_API_KEY), {
    path: ['RESEND_API_KEY'],
    message: 'is required when EMAIL_PROVIDER is resend',
  });

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${problems}`);
  }

  const env = result.data;
  return {
    databaseUrl: env.DATABASE_URL,
    port: env.PORT,
    adminPassword: env.ADMIN_PASSWORD,
    email: {
      provider: env.EMAIL_PROVIDER,
      resendApiKey: env.RESEND_API_KEY ?? '',
      from: env.EMAIL_FROM,
      maxRetries: env.EMAIL_MAX_RETRIES,
      retryDelaysSeconds: env.EMAIL_RETRY_DELAYS_SECONDS,
      fakeFailAttempts: env.FAKE_EMAIL_FAIL_ATTEMPTS,
    },
    worker: {
      startWithServer: env.START_WORKER,
      pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    },
    salon: {
      name: env.SALON_NAME,
      timeZone: env.SALON_TIMEZONE,
    },
    bookingRateLimitMax: env.BOOKING_RATE_LIMIT_MAX,
    // Render's traffic comes through Cloudflare, which sets this header itself.
    clientIpHeader: env.CLIENT_IP_HEADER ?? (env.RENDER ? 'cf-connecting-ip' : ''),
  };
}
