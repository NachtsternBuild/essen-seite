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
    .number({ invalid_type_error: 'Preis muss eine Zahl sein' })
    .positive('Preis muss größer als 0 sein')
    .max(100, 'Preis scheint zu hoch'),
  vegetarian: z.boolean().optional(),
  vegan: z.boolean().optional(),
  allergens: z.array(z.string()).optional(),
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
