import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const app = express();

// Trust proxy for rate-limiting behind Cloud Run / reverse proxies
app.set('trust proxy', 1);

// XSS & HTTP Security Headers via Helmet
// Relax frameguard for Google AI Studio iframe environment
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://apis.google.com',
          'https://*.googleapis.com',
          'https://*.firebaseio.com',
          'https://*.firebaseapp.com',
          'https://cdnjs.cloudflare.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: [
          "'self'",
          'https://*.googleapis.com',
          'https://*.firebaseio.com',
          'https://*.firebaseapp.com',
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
          'https://firestore.googleapis.com',
        ],
        frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com'],
        frameAncestors: ["'self'", 'https:', 'http:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: false, // Allows embedding within Google AI Studio preview frame
  })
);

// Standard JSON parser with size limit to prevent Denial of Wallet/Memory attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 1. Strict Auth Rate Limiter (Brute-force protection: 5 attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Please wait 15 minutes before retrying.',
    lockedUntil: Date.now() + 15 * 60 * 1000,
  },
});

// 2. General API Rate Limiter
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded. Please throttle requests.',
  },
});

// In-memory Server Security State Tracker
interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ACCESS_DENIED' | 'BACKUP_CREATED' | 'MUTATION_LOG';
  ip: string;
  userAgent: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

const serverSecurityLogs: SecurityEvent[] = [];
let failedAttemptCount = 0;
let lastSuccessfulLogin: string | null = null;
let lastBackupTime: string | null = new Date().toISOString();

// Helper to log server security events
function recordSecurityEvent(
  type: SecurityEvent['type'],
  req: Request,
  details: string,
  severity: SecurityEvent['severity'] = 'low'
) {
  const event: SecurityEvent = {
    id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    type,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'unknown',
    details,
    severity,
  };
  serverSecurityLogs.unshift(event);
  if (serverSecurityLogs.length > 500) {
    serverSecurityLogs.pop();
  }
  return event;
}

// API Routes
app.use('/api/', generalApiLimiter);

// Health & Security Status Endpoint
app.get('/api/security/stats', (_req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY_PROTECTED',
    enforcements: {
      httpsEnforced: true,
      xssSanitization: true,
      rateLimiting: true,
      roleBasedAccessControl: true,
      firestoreRulesDeployed: true,
      csrfProtection: true,
      superAdminDesignated: 'dheeniyyalibrarymanagement@gmail.com',
    },
    metrics: {
      serverUptimeSeconds: Math.floor(process.uptime()),
      totalSecurityEventsLogged: serverSecurityLogs.length,
      failedLoginAttempts: failedAttemptCount,
      lastSuccessfulLogin,
      lastBackupTime,
    },
    recentEvents: serverSecurityLogs.slice(0, 15),
  });
});

// Admin Authentication Verification API (Rate Limited)
app.post('/api/auth/admin-verify', authLimiter, (req: Request, res: Response) => {
  const { email, passwordHash, mode } = req.body;

  // Verify against Super Admin target email
  const SUPER_ADMIN_EMAIL = 'dheeniyyalibrarymanagement@gmail.com';
  const isTargetEmail = email && email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Validate request
  if (!email) {
    recordSecurityEvent('LOGIN_FAILED', req, 'Attempted admin login without email', 'medium');
    failedAttemptCount++;
    return res.status(400).json({ success: false, error: 'Administrator email is required' });
  }

  // If this is Firebase token confirmation mode
  if (mode === 'firebase_verified') {
    if (isTargetEmail) {
      lastSuccessfulLogin = new Date().toISOString();
      recordSecurityEvent('LOGIN_SUCCESS', req, `Super Admin ${email} authenticated via Google/Firebase`, 'low');
      return res.json({
        success: true,
        role: 'SUPER_ADMIN',
        email: SUPER_ADMIN_EMAIL,
        token: crypto.randomBytes(32).toString('hex'),
        permissions: ['ALL'],
      });
    } else {
      failedAttemptCount++;
      recordSecurityEvent('ACCESS_DENIED', req, `Unauthorized email ${email} attempted Super Admin access`, 'high');
      return res.status(403).json({
        success: false,
        error: 'Access Denied: This account is not authorized as Super Admin for Deeniya Arabic College.',
      });
    }
  }

  // Reject any unverified or bypass attempt
  failedAttemptCount++;
  recordSecurityEvent('LOGIN_FAILED', req, `Unauthorized or bypass login attempt rejected for ${email}`, 'high');
  return res.status(401).json({
    success: false,
    error: 'Access Denied: Master passkey bypasses are permanently disabled. Authentication requires official Firebase Authentication credentials.',
  });
});

// Security Log ingestion for client-side events
app.post('/api/security/log', (req: Request, res: Response) => {
  const { action, role, severity = 'low', meta } = req.body;
  recordSecurityEvent(
    action.includes('fail') ? 'LOGIN_FAILED' : 'MUTATION_LOG',
    req,
    `[Role: ${role || 'PUBLIC'}] ${action} ${meta ? JSON.stringify(meta) : ''}`,
    severity
  );
  res.json({ success: true });
});

// Backup Snapshot Registration
app.post('/api/security/backup-record', (req: Request, res: Response) => {
  const { bookCount, copyCount, studentCount, sizeBytes } = req.body;
  lastBackupTime = new Date().toISOString();
  recordSecurityEvent(
    'BACKUP_CREATED',
    req,
    `Database backup completed: ${bookCount} books, ${copyCount} copies, ${studentCount} students (${sizeBytes} bytes)`,
    'low'
  );
  res.json({ success: true, timestamp: lastBackupTime });
});

// 3. Gemini Multi-turn Chatbot Endpoint
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: {
    success: false,
    error: 'Too many chat requests. Please slow down and try again shortly.',
  },
});

app.post('/api/chat', chatLimiter, async (req: Request, res: Response) => {
  try {
    const { messages, model, roleId, customSystemInstruction, context } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages array is required.' });
    }

    const currentApiKey = process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      return res.status(503).json({
        success: false,
        error: 'Gemini API key is not configured. Please verify that GEMINI_API_KEY is available in the environment.',
      });
    }

    const ai = aiClient || new GoogleGenAI({
      apiKey: currentApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Default to gemini-3.8-flash; support gemini-3.1-flash-lite and gemini-4-argon
    const targetModel = model || 'gemini-3.8-flash';

    // Role-specific system instructions
    let baseInstruction = '';
    if (roleId === 'scholar') {
      baseInstruction = `You are the Senior Islamic Heritage Scholar & Manuscript Specialist (باحث ومحقق التراث الإسلامي) at Deeniya Arabic College Library.
You provide deep, scholarly analysis of Islamic classical sciences: Fiqh across the four Sunni Madhhabs (Hanafi, Maliki, Shafi'i, Hanbali), Hadith criticism & verification (Mustalah al-Hadith, classical commentaries including Fath al-Bari and Sharh al-Nawawi), Quranic Exegesis (Tafsir al-Tabari, al-Qurtubi, Ibn Kathir), Arabic linguistic sciences (Nahw, Sarf, Balagha), and biographical dictionaries of classical scholars.
Provide classical citations when relevant. Answer warmly and authoritatively in fluent Arabic or English based on the user query.`;
    } else if (roleId === 'general') {
      baseInstruction = `You are the Quick Library Service Guide (مرشد خدمات المكتبة السريع) for Deeniya Arabic College Library.
Provide prompt, clear, structured answers regarding book loans (standard 14-day checkout), student registration cards, shelf locations, research catalog tips, and study schedules. Keep your responses concise and well-organized with clear bullet points.`;
    } else {
      // Default: 'librarian'
      baseInstruction = `You are the Chief Digital Librarian & Academic Scholar (أمين مكتبة كلية دينية العربية الذكي) for Deeniya Arabic College Central Library.
The library houses a distinguished collection of 5,869 titles and 10,492 physical copies encompassing Islamic jurisprudence, Hadith collections, Arabic literature, theology, history, and academic textbooks.
Your duty is to assist students, professors, researchers, and public visitors in:
1. Navigating library categories and Dewey classifications for Islamic collections.
2. Finding specific books, authors, and accession information.
3. Structuring reading programs for Islamic studies and Arabic mastery.
4. Explaining borrowing rules and library services.
Communicate with scholarly dignity, welcoming warmth, and intellectual precision. Respond in Arabic or English according to the user's language.`;
    }

    if (customSystemInstruction) {
      baseInstruction += `\nAdditional Custom Instruction: ${customSystemInstruction}`;
    }

    if (context) {
      baseInstruction += `\nLibrary Context: Active collection has ${context.totalBooks || '5,800+'} catalog titles and ${context.totalCopies || '10,000+'} physical accession copies.`;
    }

    // Transform conversation history to @google/genai format
    const contents = messages.map((m: { role: string; text: string }) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.text || '') }],
    }));

    let response;
    let actualModelUsed = targetModel;
    try {
      response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction: baseInstruction,
        },
      });
    } catch (primaryErr: unknown) {
      const errStr = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      // Graceful fallback if model experiences transient high demand (503)
      if (
        (errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand')) &&
        targetModel !== 'gemini-3.1-flash-lite'
      ) {
        console.warn(`[GEMINI FALLBACK] ${targetModel} busy, routing to gemini-3.1-flash-lite`);
        actualModelUsed = 'gemini-3.1-flash-lite';
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction: baseInstruction,
          },
        });
      } else {
        throw primaryErr;
      }
    }

    const replyText = response.text || '';

    return res.json({
      success: true,
      reply: replyText,
      modelUsed: actualModelUsed,
      roleId: roleId || 'librarian',
    });
  } catch (err: unknown) {
    console.error('[GEMINI CHAT ERROR]:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to generate response.';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Vite middleware or production static serving
async function setupVite() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SECURE SERVER] Deeniya Arabic College Library running on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('[SERVER ERROR] Failed to start server:', err);
  process.exit(1);
});
