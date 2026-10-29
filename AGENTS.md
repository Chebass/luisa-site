# Luisa · bienestar

- Interfaz en español de Perú. Código en inglés y TypeScript estricto.
- Next.js App Router, Tailwind y componentes compatibles con shadcn/ui, Supabase.
- Fechas UTC en almacenamiento; America/Lima al mostrar o calcular días.
- Panel accesible: texto principal de 18px o más, botones de 48px o más.
- WhatsApp exclusivamente con enlaces wa.me. Sin pagos ni historial clínico.
- Clientes únicos por teléfono peruano normalizado; una reserva pública nunca cambia el nombre de un cliente existente ni devuelve sus datos.
- GET nunca cambia datos. Cambios mediante POST autenticado o token seguro; cancelación explícita.
- RLS en todas las tablas. Clave de servicio exclusivamente en servidor.
- Motor puro en lib/availability.ts con pruebas de casos límite.
- Demostración únicamente local, con datos ficticios. Nunca activar bypass de autenticación en producción.
- Ejecutar lint, typecheck, pruebas y build antes de entregar cambios.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
