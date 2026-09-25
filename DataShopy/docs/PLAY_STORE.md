# Publicación en Google Play — DataShopy

Documento de trabajo (no se publica). Copia y pega en Play Console.

## 1. Ficha de la tienda

**Nombre (máx. 30):** `DataShopy`

**Descripción corta (máx. 80):**
`Descubre locales y promociones cerca de ti, guarda favoritos y opina.`

**Descripción completa (máx. 4000):**
```
DataShopy te muestra los locales de tu ciudad y sus promociones vigentes, para que aproveches lo mejor cerca de ti.

• Encuentra locales por nombre, categoría o incluso por lo que venden: la búsqueda entiende sinónimos y errores de tipeo.
• Mira qué promociones hay activas y cuándo vencen.
• Sabe al instante si un local está abierto o cerrado, y cuánto te queda para llegar.
• Guarda tus favoritos y recibe avisos cuando publiquen una promoción nueva.
• Lee y escribe reseñas; los dueños pueden responderte.
• Toca "Cómo llegar" y abre la ruta en Google Maps.
• Comparte un local con tus amigos por WhatsApp.

¿Tienes un negocio? Reclámalo con tu código, publica tus promociones, sube tu logo y galería, responde reseñas y mira cuántas personas visitan, llaman o piden indicaciones.

Puedes explorar sin cuenta; crea una cuenta gratis para guardar favoritos, recibir avisos y opinar.
```

**Categoría:** Compras (o "Estilo de vida")  ·  **Etiquetas:** compras, ofertas, locales
**Correo de contacto:** el de `src/constants/legal.js` (`CONTACT_EMAIL`)
**Política de privacidad (URL):** `https://govanni0x404.github.io/DataShopy/privacy.html`
(requiere activar GitHub Pages sobre la carpeta `docs/` de la rama `main`)

## 2. Recursos gráficos
| Recurso | Tamaño | Fuente |
|---|---|---|
| Ícono de la app | 512×512 PNG | `assets/icon.png` reducido a 512 |
| Gráfico destacado | 1024×500 | pendiente: fondo morado `#7C4DEB` + logo + "Locales y promos cerca de ti" |
| Capturas de teléfono | mín. 2, 16:9 o 9:16 | tomar en el teléfono: Inicio, Detalle del local, Alertas, Reseñas, Panel del dueño |

Consejo: capturas con datos reales (locales con logo y promos activas), no vacías.

## 3. Formulario "Seguridad de los datos" (respuestas según el código actual)
- **¿Recopila datos?** Sí. **¿Cifrados en tránsito?** Sí (HTTPS). **¿Se puede pedir su eliminación?** Sí (Perfil → Eliminar mi cuenta).
- **Información personal:** Nombre y correo → funcionalidad de la app y gestión de cuenta. Compartido con terceros: No (Supabase actúa como procesador).
- **Ubicación aproximada/precisa:** solo en el dispositivo (distancias y ciudad). No se envía ni se guarda en el servidor → puedes declararla como "no recopilada" si no sale del dispositivo (el reverse-geocoding lo hace el sistema Android).
- **Contenido de la app:** reseñas y comentarios (públicos), fotos del dueño (logo/portada/galería).
- **Identificadores:** token de notificaciones push (funcionalidad). Sin publicidad ni analítica de terceros.
- **Actividad en la app:** eventos anónimos (ver local, llamar, indicaciones) para las estadísticas del dueño.
- **Permisos declarados:** ubicación (aprox. y precisa), notificaciones. No se usa cámara, micrófono ni almacenamiento amplio.

## 4. Checklist antes de subir
- [ ] Firebase/FCM configurado (para que lleguen las notificaciones push) — ver memoria del proyecto.
- [ ] Activar GitHub Pages (`docs/` en `main`) y comprobar `privacy.html`, `terms.html` y `store.html?id=7`.
- [ ] Protección de contraseñas filtradas activada en Supabase (Auth → Passwords).
- [ ] `version` en `app.json` (p. ej. `1.0.0`); el número de build sube solo con EAS.
- [ ] Build de producción: `npx eas build -p android --profile production` (genera `.aab`).
- [ ] Subir el `.aab` a una **prueba interna** primero; cuenta de Play Console nueva → pide 12 testers por 14 días antes de producción.
- [ ] Clasificación de contenido y público objetivo (13+; la política dice que no es para menores de 13).
- [ ] Declaración de "Cuenta de prueba" para revisión: crear un cliente y un dueño de ejemplo e ingresarlos en "Acceso a la app".
