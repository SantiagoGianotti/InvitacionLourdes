# Invitación de recibida

Sitio de una sola página en Cloudflare Pages. Las confirmaciones van a una planilla
de Google, pasando por un worker chico que vive en el mismo dominio.

```
index.html             la invitación
_worker.js             atiende /rsvp y reenvía la confirmación a la planilla
apps-script/Codigo.gs  el script que, dentro de la planilla, escribe la fila
portada.png            la imagen que muestra WhatsApp al compartir el link
favicon.svg, *.png     íconos
wrangler.jsonc         proyecto de Pages, carpeta de salida y compatibilidad
publicar.sh            arma dist/ y lo sube
```

Los textos de la invitación se editan directo en el HTML de `index.html`. Lo único
que el script de la página necesita saber (nombre para los mensajes, WhatsApp de
respaldo) está en el objeto `EVENTO`. La URL de la planilla está en `_worker.js`.

## Por qué hay un worker en el medio

Apps Script escribe la fila y después responde con un 302 a `googleusercontent.com`,
que es donde está el JSON con el resultado. Chrome de escritorio sigue ese salto sin
problema, pero los navegadores embebidos (el de WhatsApp en particular) a veces no
pueden leer esa respuesta, y la página mostraba "no se pudo guardar" con la fila ya
escrita. El invitado reintentaba y duplicaba.

Ahora el teléfono le pega a `/rsvp` en su propio dominio, y `_worker.js` hace el
viaje a Google de servidor a servidor, siguiendo la redirección a mano. Además la
planilla actualiza la fila de la persona en vez de agregar otra, así que un reintento
nunca duplica.

## Cuentas

La planilla, el Apps Script y el repo tienen que estar en cuentas personales. Si el
Apps Script queda en una cuenta de trabajo, el despliegue depende de los permisos de
esa organización y puede cortarse sin aviso.

## Conectar la planilla

1. Abrir la planilla y entrar a Extensiones, Apps Script.
2. Borrar lo que haya y pegar el contenido de `apps-script/Codigo.gs`. Guardar.
3. Implementar, Nueva implementación, tipo Aplicación web.
   - Ejecutar como: yo.
   - Quién tiene acceso: **cualquier usuario**. Sin esto el navegador de los
     invitados recibe un 401 y no se guarda nada.
4. Autorizar cuando lo pida. La pantalla de "app no verificada" es esperable porque
   el script es propio: entrar en Configuración avanzada y continuar.
5. Copiar la URL que termina en `/exec` y pegarla en `PLANILLA`, en `_worker.js`.
6. Abrir esa URL en el navegador. Si responde `{"ok":true,...}`, quedó andando.

Cada vez que se cambie el código del script hay que ir a Implementar, Administrar
implementaciones, editar la existente y elegir "Nueva versión". Guardar no alcanza, y
crear una implementación nueva cambia la URL (entonces habría que actualizar
`_worker.js` y publicar).

## Publicar

```
./publicar.sh          # producción: https://lourdes-se-recibe.pages.dev
./publicar.sh prueba   # una rama de prueba con su propia URL, sin tocar producción
```

Requiere `wrangler` logueado en la cuenta personal de Cloudflare (`wrangler login`).
Pages sube los archivos directo desde `dist/`; no lee el repo de GitHub, así que el
repo puede ser privado.

`index.html` lleva `noindex` para no aparecer en buscadores, pero cualquiera con el
link lo abre.

## Ver las confirmaciones

En la hoja `Confirmaciones` de la planilla, que se crea sola con la primera respuesta.
Una fila por persona, con fecha de la última respuesta, nombre, respuesta y restricción alimentaria.

Si alguien confirma dos veces, la segunda pisa a la primera (se busca por nombre sin
acentos ni mayúsculas). Para limpiar duplicados anteriores está `limpiarDuplicados`
en el script: elegirla en el desplegable del editor y Ejecutar.

## Si falla el guardado

El worker reintenta una vez y espera hasta 10 segundos por intento. Si aun así falla,
la invitación muestra el mensaje armado y el botón de WhatsApp para que el invitado lo
mande a mano. Para ver que la planilla responde: `curl https://lourdes-se-recibe.pages.dev/rsvp`
devuelve el conteo de confirmaciones.
