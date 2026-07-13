import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-Mail ist erforderlich')
    .email('Ungültige E-Mail-Adresse'),
  password: z
    .string()
    .min(1, 'Passwort ist erforderlich')
    .min(6, 'Passwort muss mindestens 6 Zeichen haben'),
});

// ─── User ────────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name ist erforderlich')
    .max(50, 'Name darf höchstens 50 Zeichen haben')
    .regex(/\S/, 'Name darf nicht nur Leerzeichen enthalten'),
  email: z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail'),
  password: z
    .string()
    .min(6, 'Passwort muss mindestens 6 Zeichen haben')
    .max(72, 'Passwort darf höchstens 72 Zeichen haben'),
  is_admin: z.boolean().optional(),
  info: z.string().max(100, 'Info darf höchstens 100 Zeichen haben').optional(),
});

// ─── Group ───────────────────────────────────────────────────────────────────

/** Daily order cut-off in 24h "HH:MM" form. */
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Uhrzeit im Format HH:MM erwartet');

export const groupSettingsSchema = z.object({
  logo: z.string().max(200, 'Logo darf höchstens 200 Zeichen haben').optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(40).optional(),
  currency: z.string().max(10).optional(),
  order_deadline: timeString.optional(),
  default_export: z.enum(['txt', 'csv', 'pdf', 'json']).optional(),
});

export const groupSchema = z.object({
  name: z
    .string()
    .min(1, 'Gruppenname ist erforderlich')
    .max(60, 'Name darf höchstens 60 Zeichen haben')
    .regex(/\S/, 'Name darf nicht nur Leerzeichen enthalten'),
  description: z
    .string()
    .max(200, 'Beschreibung darf höchstens 200 Zeichen haben')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Ungültige Farbe (Hex-Format erwartet)')
    .optional(),
  linked_group: z.string().nullable().optional(),
  parent_group: z.string().nullable().optional(),
  archived: z.boolean().optional(),
  settings: groupSettingsSchema.optional(),
});

// ─── Global app settings ─────────────────────────────────────────────────────

export const appSettingsSchema = z.object({
  default_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Ungültige Farbe (Hex-Format erwartet)'),
  default_language: z.string().min(1).max(10),
  default_timezone: z.string().min(1).max(40),
  default_currency: z.string().min(1).max(10),
  default_order_deadline: timeString,
  default_export: z.enum(['txt', 'csv', 'pdf', 'json']),
  default_theme: z.enum(['light', 'dark', 'system']),
});

// ─── Meal ────────────────────────────────────────────────────────────────────

export const mealItemSchema = z.object({
  number: z
    .string()
    .min(1, 'Menünummer ist erforderlich')
    .max(10, 'Nummer zu lang')
    .regex(/^\d+$/, 'Menünummer muss eine Zahl sein'),
  name: z
    .string()
    .min(1, 'Name ist erforderlich')
    .max(100, 'Name darf höchstens 100 Zeichen haben')
    .regex(/\S/, 'Name darf nicht nur Leerzeichen enthalten'),
  price: z.coerce
    .number({ error: 'Preis muss eine Zahl sein' })
    .positive('Preis muss größer als 0 sein')
    .max(100, 'Preis scheint zu hoch'),
  vegetarian: z.boolean().optional(),
  vegan: z.boolean().optional(),
  allergens: z.array(z.string()).optional(),
  additives: z.array(z.string()).optional(),
  description: z
    .string()
    .max(300, 'Beschreibung darf höchstens 300 Zeichen haben')
    .optional(),
});

// ─── Group export / import ───────────────────────────────────────────────────

export const groupExportSchema = z.object({
  version: z.literal(1),
  exported_at: z.string(),
  group: z.object({
    name: z.string().min(1).max(60),
    description: z.string().max(200).optional().default(''),
    color: z.string().optional().default('#d97706'),
    settings: groupSettingsSchema.optional(),
  }),
  meal_plans: z
    .array(
      z.object({
        year: z.number(),
        week_number: z.number(),
        status: z.enum(['upcoming', 'current', 'archived']),
        meals: z.record(z.string(), z.array(z.any())).default({}),
      })
    )
    .default([]),
});

// ─── Role ────────────────────────────────────────────────────────────────────

export const roleSchema = z.object({
  name: z
    .string()
    .min(1, 'Rollenname ist erforderlich')
    .max(50, 'Name darf höchstens 50 Zeichen haben')
    .regex(/\S/, 'Name darf nicht nur Leerzeichen enthalten'),
  slug: z
    .string()
    .min(1, 'Slug ist erforderlich')
    .max(50, 'Slug darf höchstens 50 Zeichen haben')
    .regex(/^[a-z0-9_]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und _ enthalten'),
  description: z
    .string()
    .max(200, 'Beschreibung darf höchstens 200 Zeichen haben')
    .optional(),
  permissions: z.array(z.string()).min(0),
  group: z.string().nullable().optional(),
});

// ─── Maintenance ─────────────────────────────────────────────────────────────

export const maintenanceSchema = z.object({
  active: z.boolean(),
  start_time: z.string().optional(),
  duration: z
    .string()
    .max(50, 'Dauer darf höchstens 50 Zeichen haben')
    .optional(),
  message: z
    .string()
    .max(200, 'Nachricht darf höchstens 200 Zeichen haben')
    .optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
export type MealItemInput = z.infer<typeof mealItemSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type RoleFormInput = z.infer<typeof roleSchema>;
export type GroupSettingsInput = z.infer<typeof groupSettingsSchema>;
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
