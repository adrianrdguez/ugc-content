Normalización y referencias claras: customers referencia shops, ugc_submissions referencia customers y shops. Muy limpio.

Constraints y checks: usas CHECK en reward_type y status, lo cual asegura consistencia de datos.

Triggers de updated_at: genial, te quita dolores de cabeza.

Función RPC para incrementar pedidos: muy práctica, y al ser atómica con RETURNING * te ahorras problemas de concurrencia.

Índices clave: has metido justo los que van a usarse más (status, shop_domain, etc).

🔍 Mejoras / Ajustes recomendados

Acceso multi-tenant:
Ahora mismo usas shop_domain como foreign key en varias tablas. Funciona, pero lo ideal sería usar shop_id (UUID) como FK directo.

shopify_domain podría cambiar (aunque raro), mientras que id es fijo.

Así evitarías cascadas raras si el dominio cambia.
👉 Recomendación: en customers, ugc_submissions y email_invitations usa shop_id en vez de shop_domain.

Histórico de rewards enviados:
En ugc_submissions tienes reward_sent BOOLEAN. Está bien, pero si en el futuro quieres trackear qué reward se mandó y cuándo, sería mejor:

Una tabla rewards con: id, submission_id, type, value, sent_at.

Esto te permite gestionar retries y cambios de reward.

Emails:
En customers.email pondría UNIQUE(shop_domain, email) porque muchas veces los usuarios se duplican por Shopify ID pero con el mismo email. Así evitas registros repetidos de la misma persona.

Status de submissions:
Ahora mismo tienes pending / approved / rejected. Quizá añadiría uno más:

processing (ej: si luego quieres pasar el video por IA para validación).

Índices compuestos:
Podrías mejorar performance añadiendo:

CREATE INDEX idx_customers_shop_email ON customers(shop_domain, email);

CREATE INDEX idx_ugc_shop_status ON ugc_submissions(shop_domain, status);

Seguridad en Supabase:
Recuerda que necesitarás Row Level Security (RLS) para que cada shop_id solo pueda leer/escribir sus datos.

👉 En resumen: tu schema ya está muy bien para un MVP.
Si quieres hacerlo más a prueba de futuro, yo haría dos cambios:

Usar shop_id como FK en lugar de shop_domain.

Crear tabla rewards en vez de usar reward_sent BOOLEAN.