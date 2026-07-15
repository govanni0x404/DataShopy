# Debug Session: image-upload-network
- **Status**: [OPEN]
- **Issue**: Al subir una imagen desde `Galería y logo`, la app muestra `Network request failed`.
- **Debug Server**: http://192.168.100.168:7777/event
- **Log File**: .dbg/trae-debug-log-image-upload-network.ndjson

## Reproduction Steps
1. Iniciar sesión como dueño.
2. Abrir `Galería y logo`.
3. Elegir `Subir logo`, `Subir portada` o `Agregar foto a galería`.
4. Seleccionar una imagen desde el dispositivo Android.
5. Observar el error `Network request failed`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | `fetch(asset.uri)` falla al leer la URI local (`content://` o similar) devuelta por `expo-image-picker` | High | Low | Pending |
| B | La lectura local funciona pero falla la subida a Supabase Storage | High | Low | Pending |
| C | El bucket/policies de `store-media` no están listos y la subida cae con error genérico | Med | Low | Pending |
| D | La conectividad desde la app hacia Supabase falla solo en esta operación | Med | Med | Pending |
| E | El tipo de archivo o `contentType` causa el error durante upload | Low | Low | Pending |

## Log Evidence
- Pendiente de instrumentación y reproducción.

## Verification Conclusion
- Pendiente.
