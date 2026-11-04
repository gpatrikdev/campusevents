import { betterAuth } from 'better-auth';
import { accountOptions } from './auth-options';

export default betterAuth({
  ...accountOptions,
  secret: 'local-schema-generation-only-0123456789',
  baseURL: 'http://127.0.0.1:5173',
});
