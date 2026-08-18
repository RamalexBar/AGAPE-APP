# Certificados raíz de Apple

Este directorio debe contener los certificados raíz públicos de Apple, usados para
verificar la firma (JWS) de las notificaciones de App Store Server Notifications V2
y de los recibos de compra.

## Cómo obtenerlos

1. Entrá a https://www.apple.com/certificateauthority/
2. En la sección **"Apple Root Certificates"**, descargá (como mínimo) `AppleRootCA-G3.cer`.
3. Copiá el/los archivo(s) `.cer` acá, en `backend/certs/apple/`.

Son certificados **públicos** (no son secretos), publicados por Apple — es seguro
tenerlos en el repositorio.

Sin estos archivos, `backend/src/config/appleIapVerifier.js` lanza un error claro
la primera vez que llega una notificación real de Apple, en vez de aceptar
notificaciones sin verificar su firma.
