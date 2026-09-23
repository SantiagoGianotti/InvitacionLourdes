// Corre delante del sitio en Cloudflare Pages. Todo lo que no sea /rsvp se
// sirve como archivo estático.
//
// /rsvp recibe la confirmación del invitado y se la pasa a la planilla de
// servidor a servidor. Apps Script escribe la fila y responde con un 302 a
// googleusercontent, donde está el JSON; los navegadores embebidos (el de
// WhatsApp, sobre todo) manejaban mal ese salto y mostraban un error falso.
// Acá el teléfono habla con su propio dominio y nada más.
//
// Apps Script además puede tardar más de 10 segundos en frío. Al invitado se
// le responde en ESPERA_RAPIDA como máximo; si la planilla todavía no contestó,
// la escritura se termina en segundo plano con reintentos. Es seguro porque la
// planilla actualiza la fila de la persona en vez de agregar otra.

const PLANILLA = "https://script.google.com/macros/s/AKfycbztE8ICHy5OdxmpSvoos2P2FO6vlwDVxdg3FiBsaEQ1VWIoP6jiIKmQUXG3VeoggMCM/exec";
const ESPERA_RAPIDA = 4000;   // ms: lo máximo que el invitado mira "Confirmando..."
const ESPERA_INTENTO = 9000;  // ms por intento contra Apps Script
const INTENTOS = 3;           // 3 x 9 s entra en los 30 s que da waitUntil
const PAUSA_ENTRE_INTENTOS = 500;
const CUERPO_MAXIMO = 4096;   // bytes: una confirmación real pesa unos 150

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/rsvp") return env.ASSETS.fetch(request);

    if (request.method === "GET") {
      try {
        return json(await planilla("GET"));
      } catch (err) {
        return json({ ok: false, error: mensaje(err) }, 502);
      }
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "método no permitido" }, 405);
    }

    if (Number(request.headers.get("content-length") || 0) > CUERPO_MAXIMO) {
      return json({ ok: false, error: "respuesta demasiado larga" }, 413);
    }

    const cuerpo = await request.text();
    if (cuerpo.length > CUERPO_MAXIMO) {
      return json({ ok: false, error: "respuesta demasiado larga" }, 413);
    }

    let datos;
    try {
      datos = JSON.parse(cuerpo);
    } catch (err) {
      return json({ ok: false, error: "el cuerpo no es JSON" }, 400);
    }
    if (!datos || !String(datos.nombre || "").trim()) {
      return json({ ok: false, error: "falta el nombre" }, 400);
    }

    // La escritura arranca ya. Se le da ESPERA_RAPIDA para terminar; si no
    // llega, se responde igual y se la deja completar en segundo plano.
    const escritura = guardarConReintentos(cuerpo);
    const resultado = await Promise.race([
      escritura.then((r) => ({ termino: true, r })).catch((err) => ({ termino: true, err })),
      dormir(ESPERA_RAPIDA).then(() => ({ termino: false })),
    ]);

    if (resultado.termino) {
      if (resultado.err) return json({ ok: false, error: "no se pudo guardar: " + mensaje(resultado.err) }, 502);
      return json(resultado.r);
    }

    ctx.waitUntil(
      escritura.catch((err) => {
        console.error(JSON.stringify({ evento: "rsvp_fallo_en_segundo_plano", error: mensaje(err) }));
      })
    );
    return json({ ok: true, pendiente: true });
  },
};

async function guardarConReintentos(cuerpo) {
  let ultimo;
  for (let i = 1; i <= INTENTOS; i++) {
    try {
      return await planilla("POST", cuerpo);
    } catch (err) {
      ultimo = err;
      if (i < INTENTOS) await dormir(PAUSA_ENTRE_INTENTOS);
    }
  }
  throw ultimo;
}

async function planilla(metodo, cuerpo) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_INTENTO);

  try {
    const primera = await fetch(PLANILLA, {
      method: metodo,
      headers: metodo === "POST" ? { "Content-Type": "text/plain;charset=UTF-8" } : undefined,
      body: metodo === "POST" ? cuerpo : undefined,
      redirect: "manual",
      signal: control.signal,
    });

    // El 302 se sigue a mano, con GET, para no depender de cómo el runtime
    // cambia el método al seguir redirecciones.
    let respuesta = primera;
    if (primera.status >= 300 && primera.status < 400) {
      const destino = primera.headers.get("Location");
      if (!destino) throw new Error("redirección sin destino");
      respuesta = await fetch(destino, { redirect: "follow", signal: control.signal });
    }

    if (!respuesta.ok) throw new Error("la planilla respondió " + respuesta.status);

    const datos = await respuesta.json();
    if (!datos || typeof datos.ok !== "boolean") throw new Error("respuesta inesperada de la planilla");
    return datos;
  } finally {
    clearTimeout(reloj);
  }
}

function dormir(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function json(objeto, status = 200) {
  return new Response(JSON.stringify(objeto), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function mensaje(err) {
  if (err && err.name === "AbortError") return "la planilla tardó demasiado";
  return err && err.message ? err.message : String(err);
}
