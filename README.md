# Luisa · bienestar

Aplicación de citas para masajes en casa de la dueña del negocio. Next.js App Router, TypeScript, Tailwind, componentes compatibles con shadcn/ui y Supabase. Interfaz en español de Perú, pensada para una sola administradora y clientes sin cuenta.

## Empezar en local

Requiere Node.js 22.12 o superior (verificado con Node 24).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abrir [el panel](http://localhost:3000/inicio) o [la reserva pública](http://localhost:3000/reservar).

Sin claves de Supabase y con `NEXT_PUBLIC_DEMO_MODE=true`, el servidor de desarrollo ofrece una demostración con clientes ficticios. Los cambios se guardan en el navegador y pueden reiniciarse desde Ajustes. La reserva de prueba aparece en el panel al volver a cargarlo. No se envían mensajes a números ficticios. El botón de respaldo de la reserva permite abrir WhatsApp con el número de pruebas configurado, pero el usuario debe enviar el mensaje.

La demostración se desactiva siempre con `NODE_ENV=production`, incluso si alguien olvida cambiar la variable. No debe usarse para datos reales.

## Conectar Supabase

1. Crear un proyecto de Supabase. En su editor SQL, ejecutar `supabase/migrations/202610280001_initial.sql` y después `supabase/seed.sql`. La migración se ejecuta una sola vez en una base vacía. También se puede aplicar mediante Supabase CLI.
2. Registrar el correo permitido en la base de datos:

   ```sql
   insert into public.owner_access(email) values ('CORREO_DE_LA_DUEÑA');
   update public.settings set owner_name='Luisa',owner_phone='51NUMERO_DE_9_DIGITOS' where id=1;
   ```

3. Completar `.env.local`:

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` del proyecto |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta `service_role`, exclusivamente servidor |
   | `OWNER_EMAIL` | El mismo correo registrado en `owner_access` |
   | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en local; origen HTTPS exacto en producción, sin barra final |
   | `NEXT_PUBLIC_DEMO_MODE` | `false` al conectar datos reales |

4. En Supabase Authentication, activar Google. Crear las credenciales OAuth siguiendo [la guía de Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google). Registrar en Google la URL de callback de **Supabase**, y en Supabase las URLs de redirección de la **aplicación**: `http://localhost:3000/auth/callback` y la correspondiente URL HTTPS de producción. Configurar también Site URL.
5. Ingresar con Google usando el correo permitido. El servidor comprueba la identidad con `getUser()` antes de leer datos y en cada endpoint privado. Las políticas RLS también comprueban la lista de acceso. Las cuentas distintas no reciben datos.
6. Revisar Ajustes: nombre, WhatsApp, duración, horarios, anticipación y mensajes.

El correo de pruebas ya se dejó en el `.env.local` de esta máquina; no se versiona. Las claves y contraseñas no deben enviarse por el chat ni guardarse en Git. El número de pruebas se usa en los datos ficticios; reemplazarlo al activar la app real.

## Reserva pública y protección

Crear un widget gratuito de [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/) para los dominios de la aplicación, incluyendo `localhost` cuando corresponda. Completar `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`. El servidor comprueba el desafío y el hostname; no hay bypass de Turnstile para reservas reales. Para desarrollo conectado se pueden utilizar [las claves de prueba oficiales](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) únicamente en local.

La reserva usa un campo señuelo y límites de frecuencia atómicos en Postgres por IP y por teléfono. El alojamiento debe reemplazar `X-Forwarded-For` por una dirección de cliente fiable. La protección por teléfono y Turnstile no depende de esa cabecera.

La respuesta de reserva tiene la misma estructura para números nuevos y existentes: fecha, hora y enlace de WhatsApp. El mensaje usa el nombre escrito en el formulario. Nunca devuelve el nombre guardado, las notas o el historial. Un teléfono repetido conserva la ficha original y reactiva clientes archivados.

Los enlaces de cita llevan tokens aleatorios de 32 bytes. Los GET solo consultan o sirven páginas. Confirmar hace POST desde JavaScript; cancelar requiere confirmación explícita; modificar valida de nuevo el horario. Los POST exigen mismo origen y cabecera propia y rechazan robots conocidos. Los tokens vencen al terminar la cita. Las acciones de confirmar y cancelar son idempotentes.

## Qué incluye

- Inicio con agenda del día, próximas citas, recordatorios manuales y enlace público.
- Calendario semanal y mensual, colores y filtro por estado.
- Crear, mover, confirmar, cancelar, marcar atendida o no asistió; notas e historial de eventos.
- Seleccionar clientes existentes o crearlos por teléfono único. Fichas, búsqueda, notas privadas, archivo e historial.
- Horarios fijos y bloqueos puntuales: crear, editar y liberar con confirmación. No se guardan bloqueos que choquen con citas. La dueña puede agendar sobre sus bloqueos solo tras una confirmación explícita; nunca encima de otra cita.
- Reserva pública en tres pasos, datos recordados en el propio dispositivo y manejo de conflictos sin perder lo escrito.
- Enlaces de confirmar, cancelar y modificar; plantillas editables de WhatsApp, exclusivamente `wa.me`.
- Notificaciones dentro de la app con Supabase Realtime y actualización al recuperar el foco y cada 45 segundos mientras esté visible.
- Web Push, PWA instalable, avisos de desconexión y exportación privada de clientes y citas a CSV.

No incluye pagos, API de WhatsApp, historia clínica, varios terapeutas o sedes. La marca de recordatorio indica que se abrió WhatsApp; la app no puede saber si el mensaje se envió.

## PWA y notificaciones

Los iconos, el manifiesto y el service worker están incluidos. Para regenerar los PNG desde el SVG: `node scripts/generate-icons.mjs`.

Generar claves VAPID una sola vez con `npx web-push generate-vapid-keys` y guardarlas en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`. Configurar `VAPID_SUBJECT` como un `mailto:` válido. En Ajustes, tocar **Activar avisos** en cada dispositivo. La aplicación no pide permiso al abrir. Las suscripciones vencidas se eliminan al enviar.

Web Push e instalación requieren HTTPS en producción. En iPhone, instalar primero desde Safari con Compartir → Agregar a pantalla de inicio; verificar con un iPhone real. Consultar [la documentación de WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Mientras la agenda está abierta, puede seguir consultándose si se pierde la conexión; se bloquean los cambios. Después de recargar sin conexión, se ofrece una copia básica de los próximos 14 días guardada en el dispositivo hasta 12 horas: nombres, horas y estados, sin teléfonos, notas ni tokens. Se cifra con Web Crypto en IndexedDB y se elimina al cerrar sesión. Como toda copia local, requiere un dispositivo personal y no puede enterarse de una revocación remota mientras esté desconectado. El service worker solo almacena la pantalla genérica sin conexión; no guarda respuestas autenticadas ni fichas en la caché de recursos. Las páginas públicas y enlaces de acción no usan esa copia. La demostración no guarda esta copia privada.

Para marcar citas pasadas como atendidas, activar `pg_cron` en Supabase y ejecutar `supabase/maintenance.sql`. Corre cada 30 minutos y registra eventos, sin sobrescribir canceladas ni ausencias. No se programan recordatorios de WhatsApp: se envían manualmente.

## Verificación

La atención se realiza en casa de la dueña. La interfaz usa calendarios de React DayPicker en español y selectores accesibles de Radix para fechas, horas y opciones. Los desplegables se mantienen en la misma capa del modal para permitir teclado y toque. Los modales están centrados, bloquean el desplazamiento del fondo y animan su apertura y cierre. Motion y CSS aportan transiciones breves que respetan la preferencia de movimiento reducido. Cada sección tiene su propio skeleton y las acciones asíncronas muestran el progreso en el botón correspondiente.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Pruebas de navegador: con `npm run dev` activo, ejecutar `npm run test:e2e`. Usa Chrome instalado en Windows; en otros sistemas, ejecutar antes `npx playwright install chromium`, o indicar `CHROME_PATH`. `TEST_BASE_URL` permite cambiar la URL. Incluye escritorio y tamaño iPhone; no sustituye probar Safari ni las notificaciones en un teléfono real. Las capturas y trazas locales quedan en `test-results/`, fuera de Git.

Pruebas SQL: `npm run test:db` requiere binarios de PostgreSQL. Usa por defecto PostgreSQL 18 en Windows; en otros sistemas configurar `POSTGRES_BIN` con el directorio de `initdb`, `postgres`, `pg_ctl` y `psql`. Crea un clúster temporal aislado en el puerto 55439 y lo detiene al terminar. No utiliza credenciales de producción. Valida concurrencia, exclusión de horarios, teléfonos únicos, nombre inmutable desde reservas públicas, permisos, RLS, tokens, idempotencia, bloqueos y auditoría. La carpeta temporal se indica en la salida para su revisión.

Prueba del modo producción sin credenciales: después de compilar, ejecutar `npm start -- --port 3001` y, en otra terminal, `npm run test:production`. Comprueba que no existe acceso a la demo, que el panel exige conexión/autenticación y que los enlaces públicos usan POST únicamente cuando corresponde. Las respuestas HTTP de tokens se simulan en el navegador; la prueba SQL verifica las transacciones reales. `PRODUCTION_TEST_URL` permite cambiar el origen del servidor de prueba.

## Publicación y costo

No se ha publicado ni conectado una cuenta real de Supabase. Faltan las credenciales, Google OAuth, Turnstile, VAPID y elegir el alojamiento. Configurar las variables de producción y aplicar las migraciones antes de aceptar reservas reales.

**La propuesta original de usar Vercel Hobby para un negocio requiere cambiarse:** [Vercel limita Hobby a uso personal y no comercial](https://vercel.com/docs/plans/hobby). Este proyecto no promete un despliegue comercial gratuito en ese plan. Puede compilarse como Next.js estándar (`npm run build` / `npm start`); el proveedor compatible con uso comercial y costo cero debe validarse antes del despliegue. No se ha contratado ningún plan de pago.

[Supabase Free puede pausar proyectos con poca actividad durante siete días](https://supabase.com/docs/guides/platform/free-project-pausing). Reanudar desde su panel si ocurre; no se promete disponibilidad permanente ni restauración a un punto en el tiempo. Usar la exportación CSV como respaldo mensual.

Antes del lanzamiento queda verificar de extremo a extremo con las cuentas reales: Google OAuth y restricción de correo, Turnstile y redirecciones de WhatsApp en su navegador interno, Realtime, Web Push y la instalación en los celulares de la dueña. También falta la prueba de uso con ella para ajustar legibilidad y vocabulario.

## Estructura

`app/(admin)` contiene el panel protegido; `app/(public)` las reservas y acciones por token. `app/api` aplica autenticación, validación y reglas del servidor. `lib/availability.ts` es el motor puro de horarios; `lib/server` y `lib/supabase/server.ts` solo pueden importarse en servidor. Las operaciones de cita son transacciones SQL que bloquean la fila de ajustes y usan una exclusión GiST como segunda barrera contra cruces. Todas las tablas tienen RLS; `anon` no puede leer clientes ni ejecutar las funciones privilegiadas. La clave de servicio nunca se importa en componentes del navegador.
