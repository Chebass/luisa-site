-- Replace with the SAME address as OWNER_EMAIL before running.
-- insert into public.owner_access(email) values ('correo-real@example.com');
insert into public.message_templates(key,body) values
 ('reserva_cliente','Hola {nombre_dueña}, soy {nombre}. Reservé mi cita de masaje para el {fecha} a las {hora}. ¡Gracias!'),
 ('agendada_dueña','Hola {nombre}, tu cita de masaje quedó agendada para el {fecha} a las {hora}. Te espero. — {nombre_dueña}'),
 ('recordatorio',E'Hola {nombre}, te recuerdo tu cita de masaje el {fecha} a las {hora}.\nConfirmar: {enlace_confirmar}\nCancelar: {enlace_cancelar}\nCambiar de horario: {enlace_modificar}'),
 ('confirmada_cliente','Hola {nombre_dueña}, confirmo mi asistencia a la cita del {fecha} a las {hora}.'),
 ('cancelada_cliente','Hola {nombre_dueña}, cancelo mi cita del {fecha} a las {hora}. Gracias.'),
 ('modificada_cliente','Hola {nombre_dueña}, cambié mi cita del {fecha_anterior} a las {hora_anterior} al {fecha} a las {hora}.'),
 ('cancelada_dueña','Hola {nombre}, debo cancelar tu cita del {fecha} a las {hora}. Disculpa las molestias. Puedes elegir otro horario aquí: {enlace_reservas}'),
 ('modificada_dueña','Hola {nombre}, tuve que mover tu cita del {fecha_anterior} a las {hora_anterior} al {fecha} a las {hora}. Si no te acomoda, cámbiala aquí: {enlace_modificar}')
on conflict(key) do nothing;
