import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { triggerDebouncedUsersBackup, restoreUsersFromS3 } from './s3DatabaseBackup';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users_store.json');
const JWT_SECRET = process.env.SESSION_SECRET || 'hentaikage_secure_ec2_jwt_auth_secret_2026_s3_backed';
const COOKIE_NAME = 'hk_session';

export interface LocalUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'user' | 'moderator';
  banned?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserSessionPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  exp: number;
}

let memoryUsers: LocalUser[] | null = null;

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeUsersStoreToDisk(users: LocalUser[]) {
  try {
    ensureDataDirectory();
    const tempFile = `${USERS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2), 'utf-8');
    fs.renameSync(tempFile, USERS_FILE);
    // Debounced AWS S3 Sydney backup
    triggerDebouncedUsersBackup();
  } catch (err) {
    console.error('[AuthStore] Error writing users store to disk:', err);
  }
}

function loadUsersFromDisk(): LocalUser[] | null {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && Array.isArray(parsed.users)) {
        return parsed.users;
      }
    }
  } catch (err) {
    console.error('[AuthStore] Error reading users store from disk:', err);
  }
  return null;
}

// ============================================================================
// CRYPTO HELPERS (scrypt + constant time verify)
// ============================================================================

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const bufCandidate = Buffer.from(candidateHash, 'hex');
    const bufStored = Buffer.from(storedHash, 'hex');
    if (bufCandidate.length !== bufStored.length) return false;
    return crypto.timingSafeEqual(bufCandidate, bufStored);
  } catch {
    return false;
  }
}

// ============================================================================
// JWT TOKEN GENERATION & VERIFICATION (HMAC-SHA256, 30-day session)
// ============================================================================

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function createSessionToken(user: LocalUser): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: UserSessionPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): UserSessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const bufSig = Buffer.from(signature);
    const bufExpected = Buffer.from(expectedSignature);
    if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
      return null;
    }

    const payload: UserSessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

// ============================================================================
// USER STORE OPERATIONS (Fast memory-cached EC2 DB)
// ============================================================================

export async function getLocalUsers(): Promise<LocalUser[]> {
  if (memoryUsers) {
    return memoryUsers;
  }

  const diskUsers = loadUsersFromDisk();
  if (diskUsers && diskUsers.length > 0) {
    memoryUsers = diskUsers;
    return memoryUsers;
  }

  // Attempt cold-boot restore from AWS S3 Sydney
  try {
    const s3Users = await restoreUsersFromS3();
    if (s3Users) {
      const list: LocalUser[] = Array.isArray(s3Users) ? s3Users : s3Users.users || [];
      if (list.length > 0) {
        memoryUsers = list;
        return list;
      }
    }
  } catch (err: any) {
    console.warn('[AuthStore] S3 users restore skipped:', err.message);
  }

  // Default initial seed if store is completely new
  const defaultAdmin = createInitialAdminUser();
  memoryUsers = [defaultAdmin];
  writeUsersStoreToDisk(memoryUsers);
  return memoryUsers;
}

function createInitialAdminUser(): LocalUser {
  const { salt, hash } = hashPassword('Ayush@1234');
  return {
    id: '66abdbfa-e142-48cf-9704-349c4d394d02',
    email: 'ayushchandramola95@gmail.com',
    username: 'AdminAyush',
    passwordHash: hash,
    salt,
    role: 'admin',
    banned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<LocalUser | null> {
  const users = await getLocalUsers();
  const clean = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === clean) || null;
}

export async function findUserById(id: string): Promise<LocalUser | null> {
  const users = await getLocalUsers();
  return users.find((u) => u.id === id) || null;
}

export async function createLocalUser(params: {
  email: string;
  username: string;
  password?: string;
  passwordHash?: string;
  salt?: string;
  role?: 'admin' | 'user' | 'moderator';
}): Promise<LocalUser> {
  const users = await getLocalUsers();
  const cleanEmail = params.email.trim().toLowerCase();

  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('A user with this email address already exists.');
  }

  let finalSalt = params.salt;
  let finalHash = params.passwordHash;

  if (params.password) {
    const hashed = hashPassword(params.password);
    finalSalt = hashed.salt;
    finalHash = hashed.hash;
  }

  if (!finalSalt || !finalHash) {
    throw new Error('Password or password hash is required to create a user.');
  }

  // Check if this is the known master admin email
  const isAdminEmail = cleanEmail === 'ayushchandramola95@gmail.com' || cleanEmail === 'ayushramola167@gmail.com';
  const role = params.role || (isAdminEmail ? 'admin' : 'user');

  const newUser: LocalUser = {
    id: crypto.randomUUID(),
    email: cleanEmail,
    username: params.username.trim() || cleanEmail.split('@')[0],
    passwordHash: finalHash,
    salt: finalSalt,
    role,
    banned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.unshift(newUser);
  memoryUsers = users;
  writeUsersStoreToDisk(users);
  return newUser;
}

export async function updateLocalUser(
  id: string,
  updates: Partial<Omit<LocalUser, 'id' | 'createdAt'>>
): Promise<LocalUser | null> {
  const users = await getLocalUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  users[idx] = {
    ...users[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  memoryUsers = users;
  writeUsersStoreToDisk(users);
  return users[idx];
}

export async function deleteLocalUser(id: string): Promise<boolean> {
  const users = await getLocalUsers();
  const initialLength = users.length;
  const filtered = users.filter((u) => u.id !== id);

  if (filtered.length === initialLength) return false;

  memoryUsers = filtered;
  writeUsersStoreToDisk(filtered);
  return true;
}

export async function resetUserPassword(id: string, newPassword: string): Promise<boolean> {
  const { salt, hash } = hashPassword(newPassword);
  const updated = await updateLocalUser(id, {
    salt,
    passwordHash: hash,
  });
  return Boolean(updated);
}

// ============================================================================
// SERVER SESSION RETRIEVAL (Checks hk_session cookie in <0.02ms)
// ============================================================================

export async function getCurrentUserFromCookies(): Promise<LocalUser | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload || !payload.userId) return null;

    const user = await findUserById(payload.userId);
    if (!user || user.banned) return null;

    return user;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
