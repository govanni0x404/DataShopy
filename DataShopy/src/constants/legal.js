// Single source for the legal texts: rendered in-app by LegalScreen and
// exported to docs/*.html by scripts/build-legal.js (the public URL Google Play asks for).
// Plain CommonJS-compatible data on purpose so the Node script can require it.

const CONTACT_EMAIL = 'govanifuentesrr@gmail.com';
const UPDATED = '24 de septiembre de 2026';

const privacy = {
  title: 'Política de privacidad',
  updated: UPDATED,
  intro:
    'DataShopy es una aplicación para descubrir locales y promociones cercanas. Esta política explica qué datos tratamos, para qué y qué control tienes sobre ellos.',
  sections: [
    {
      heading: 'Datos que recopilamos',
      items: [
        'Cuenta: nombre, correo electrónico y contraseña (la contraseña se guarda cifrada por nuestro proveedor de autenticación; nosotros nunca la vemos).',
        'Ubicación aproximada o precisa, solo mientras usas la app y solo si aceptas el permiso. Se usa en tu dispositivo para ordenar los locales por distancia y para abrir indicaciones; no la guardamos en nuestros servidores.',
        'Actividad en la app: locales que marcas como favoritos, reseñas y calificaciones que publicas (junto con tu nombre visible) y eventos de uso anónimos como ver un local, llamar o pedir indicaciones.',
        'Token de notificaciones push de tu dispositivo, si activas las notificaciones.',
        'Si eres dueño de un local: datos del negocio (nombre, dirección, horarios, teléfono, promociones) y las imágenes que subas (logo, portada, galería).',
      ],
    },
    {
      heading: 'Para qué usamos tus datos',
      items: [
        'Mostrarte locales y promociones cercanas y mantener tus favoritos entre dispositivos.',
        'Publicar tus reseñas y calificaciones para otros usuarios.',
        'Enviarte notificaciones sobre promociones de tus locales favoritos (los dueños reciben avisos de reseñas nuevas y del estado de sus reclamos). Puedes desactivarlas en Perfil > Configuración.',
        'Entregar a cada dueño estadísticas agregadas de su local (visitas, llamadas, indicaciones) y mejorar la app.',
        'Seguridad y prevención de abuso.',
      ],
    },
    {
      heading: 'Con quién los compartimos',
      items: [
        'No vendemos tus datos ni los usamos para publicidad de terceros.',
        'Usamos proveedores que procesan datos en nuestro nombre: Supabase (base de datos, autenticación y almacenamiento) y Expo (envío de notificaciones push).',
        'Tu nombre y tus reseñas son visibles para otros usuarios de la app. Tu correo no es visible para ellos.',
      ],
    },
    {
      heading: 'Conservación',
      items: [
        'Conservamos tus datos mientras tengas una cuenta. Los eventos de uso se eliminan automáticamente pasado un tiempo.',
        'Al eliminar tu cuenta se borran tu perfil, favoritos, reseñas y solicitudes. Los eventos de uso restantes quedan sin ningún dato que te identifique.',
      ],
    },
    {
      heading: 'Tus derechos',
      items: [
        'Puedes acceder, corregir o eliminar tus datos. Puedes eliminar tu cuenta desde la app en Perfil > Eliminar mi cuenta, o escribiéndonos al correo de contacto.',
        'Puedes revocar los permisos de ubicación, fotos y notificaciones en los ajustes de tu teléfono en cualquier momento.',
      ],
    },
    {
      heading: 'Menores de edad',
      items: ['DataShopy no está dirigida a menores de 13 años y no recopilamos a sabiendas datos de ellos.'],
    },
    {
      heading: 'Cambios y contacto',
      items: [
        'Si cambiamos esta política, actualizaremos la fecha de arriba y, si el cambio es importante, te avisaremos en la app.',
        `Consultas o solicitudes sobre tus datos: ${CONTACT_EMAIL}`,
      ],
    },
  ],
};

const terms = {
  title: 'Términos y condiciones',
  updated: UPDATED,
  intro: 'Al crear una cuenta o usar DataShopy aceptas estos términos. Si no estás de acuerdo, no uses la app.',
  sections: [
    {
      heading: 'El servicio',
      items: [
        'DataShopy permite descubrir locales y sus promociones, y a los dueños de negocios publicarlas. La información de locales y promociones la entregan los propios negocios o el catálogo de la app, y puede cambiar o contener errores. Confirma con el local antes de ir.',
      ],
    },
    {
      heading: 'Tu cuenta',
      items: [
        'Debes entregar datos verdaderos y mantener tu contraseña en secreto. Eres responsable de lo que ocurra en tu cuenta.',
        'Los dueños deben ser realmente responsables del local que reclaman. Podemos rechazar o revertir reclamos dudosos.',
      ],
    },
    {
      heading: 'Contenido que publicas',
      items: [
        'Las reseñas deben reflejar tu experiencia real. No se permite contenido ofensivo, discriminatorio, ilegal, engañoso, spam ni datos personales de terceros.',
        'Los dueños no pueden reseñar su propio local ni publicar promociones falsas o engañosas.',
        'Nos concedes permiso para mostrar el contenido que publiques dentro de la app. Puedes eliminar tus reseñas cuando quieras.',
        'Podemos eliminar contenido o suspender cuentas que incumplan estos términos.',
      ],
    },
    {
      heading: 'Uso aceptable',
      items: [
        'No intentes acceder a datos de otros usuarios, alterar el funcionamiento de la app, extraer datos de forma masiva ni usarla para fines ilícitos.',
      ],
    },
    {
      heading: 'Responsabilidad',
      items: [
        'DataShopy se ofrece "tal cual". No somos parte de la relación entre clientes y locales, ni garantizamos la veracidad de precios, promociones o disponibilidad. En la medida permitida por la ley, no respondemos por daños derivados del uso de la app o de la relación con los locales.',
      ],
    },
    {
      heading: 'Cambios y ley aplicable',
      items: [
        'Podemos actualizar estos términos; el uso continuado de la app implica aceptarlos. Se rigen por las leyes de Chile.',
        `Contacto: ${CONTACT_EMAIL}`,
      ],
    },
  ],
};

module.exports = { CONTACT_EMAIL, UPDATED, LEGAL_DOCS: { privacy, terms } };
