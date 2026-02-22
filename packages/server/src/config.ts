export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  inactivityTimeout: 5 * 60 * 1000, // 5 minutes
  maxNameLength: 20,
} as const;
