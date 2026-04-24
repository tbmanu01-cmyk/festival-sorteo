import { z } from "zod";

export const registroSchema = z
  .object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    apellido: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
    documento: z.string().min(6, "El documento debe tener al menos 6 caracteres"),
    correo: z.string().email("Correo electrónico inválido"),
    celular: z
      .string()
      .regex(/^3\d{9}$/, "El celular debe ser un número colombiano válido (10 dígitos, empieza por 3)"),
    whatsapp: z
      .string()
      .min(1, "El número de WhatsApp es requerido")
      .refine(
        (val) => {
          const digits = val.replace(/[\s\-\(\)+]/g, "");
          return (
            (digits.length === 10 && digits.startsWith("3")) ||
            (digits.length === 12 && digits.startsWith("573"))
          );
        },
        "Número colombiano inválido (ej: +57 300 000 0000 o 300 000 0000)"
      ),
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
