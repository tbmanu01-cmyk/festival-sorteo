import { z } from "zod";

// Elimina etiquetas HTML y caracteres de control de campos de texto libre
const textoSeguro = (min: number, msg: string) =>
  z.string()
    .transform((v) => v.replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim())
    .pipe(z.string().min(min, msg));

// Un solo nombre/apellido: solo letras (con tildes y ñ), sin espacios, sin
// números ni símbolos, máximo 20 caracteres. Evita que alguien meta varios
// nombres seguidos o texto basura en un campo pensado para una sola palabra.
const nombrePropio = (msg: string) =>
  z.string()
    .transform((v) => v.trim())
    .pipe(
      z.string()
        .min(2, msg)
        .max(20, "Máximo 20 caracteres")
        .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$/, "Solo letras, sin espacios ni caracteres especiales")
    );

export const nombreSchema = nombrePropio("El nombre debe tener al menos 2 caracteres");
export const apellidoSchema = nombrePropio("El apellido debe tener al menos 2 caracteres");

export const registroSchema = z
  .object({
    nombre:   nombreSchema,
    apellido: apellidoSchema,
    documento: z.string().min(6, "El documento debe tener al menos 6 caracteres"),
    correo: z.string().email("Correo electrónico inválido"),
    celular: z
      .string()
      .regex(/^3\d{9}$/, "El celular debe ser un número colombiano válido (10 dígitos, empieza por 3)"),
    ciudad: z.string().min(2, "Selecciona una ciudad"),
    departamento: z.string().min(2, "Selecciona un departamento"),
    banco: z.string().min(2, "Selecciona un banco"),
    tipoCuenta: z.enum(["AHORROS", "CORRIENTE"], "Selecciona el tipo de cuenta"),
    cuentaBancaria: z.string().min(5, "El número de cuenta debe tener al menos 5 dígitos"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmarPassword: z.string(),
    terminos: z.literal(true, "Debes aceptar los términos y condiciones"),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });

export type RegistroFormData = z.infer<typeof registroSchema>;

export const loginSchema = z.object({
  correo: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
