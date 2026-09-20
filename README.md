# Invitación de recibida

Sitio estático de una sola página. Las confirmaciones van a una planilla de Google.

```
index.html            la invitación
apps-script/Codigo.gs  el script que recibe las confirmaciones
portada.png            la imagen que muestra WhatsApp al compartir el link
```

Todo lo editable de la invitación (nombre, fecha, lugar, textos) está en el objeto
`EVENTO`, arriba del `<script>` en `index.html`. La URL de la planilla está justo
encima, en `PLANILLA`.

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
5. Copiar la URL que termina en `/exec` y pegarla en `PLANILLA`, en `index.html`.
6. Abrir esa URL en el navegador. Si responde `{"ok":true,...}`, quedó andando.

Cada vez que se cambie el código hay que crear una implementación nueva (o editar la
existente y subir la versión). Guardar el archivo no alcanza.

## Publicar en GitHub Pages

1. Crear un repo en la cuenta personal y subir estos archivos.
2. Settings, Pages, Source: Deploy from a branch, rama `main`, carpeta `/ (root)`.
3. Queda en `https://<usuario>.github.io/<repo>/`.

El repo tiene que ser público para que Pages funcione en el plan gratuito, así que la
dirección y la fecha quedan visibles en internet. `index.html` lleva `noindex` para
que no aparezca en buscadores, pero eso no lo vuelve privado: cualquiera con el link
lo abre. Para que sea realmente privado hace falta un repo privado con GitHub Pro, o
Cloudflare Pages, que sirve desde repos privados en el plan gratuito.

## Ver las confirmaciones

En la hoja `Confirmaciones` de la planilla, que se crea sola con la primera respuesta.
Una fila por envío, con fecha, nombre, respuesta y restricción alimentaria.

Si alguien confirma dos veces quedan dos filas. Vale la última por fecha.

## Si falla el guardado

La invitación no se queda muda: muestra el mensaje armado y el botón de WhatsApp para
que el invitado lo mande a mano. Nadie pierde la confirmación porque se cayó el script.
