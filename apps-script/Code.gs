
/**
 * NÉBULA - Servicio de envío de códigos OTP
 *
 * Propiedad requerida:
 *   SHARED_SECRET
 *
 * Debe coincidir exactamente con:
 *   APPS_SCRIPT_SECRET del backend.
 *
 * Configuración de implementación:
 *   Tipo: Aplicación web
 *   Ejecutar como: Yo
 *   Acceso: Cualquier persona
 */

var APP_NAME = 'Nébula';

var MAX_SKEW_MS = 60 * 1000;
var NONCE_TTL_S = 300;
var LOCK_TIMEOUT_MS = 10000;

var SUBJECTS = {
  verify_email: 'Tu código de verificación de ' + APP_NAME,
  reset_password: 'Código para restablecer tu contraseña de ' + APP_NAME
};

var INTROS = {
  verify_email: 'Usa este código para verificar tu correo:',
  reset_password: 'Usa este código para restablecer tu contraseña:'
};


/**
 * Entrada HTTP POST.
 */
function doPost(e) {
  var lock = null;

  try {
    // 1. Validar solicitud.
    if (
      !e ||
      !e.postData ||
      typeof e.postData.contents !== 'string' ||
      e.postData.contents.length > 4096
    ) {
      return out(false, 'INVALID_REQUEST');
    }

    // 2. Leer JSON.
    var d;

    try {
      d = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return out(false, 'INVALID_JSON');
    }

    if (!isValidShape(d)) {
      return out(false, 'INVALID_SHAPE');
    }

    // 3. Obtener secreto.
    var secret = PropertiesService
      .getScriptProperties()
      .getProperty('SHARED_SECRET');

    if (!secret || secret.length < 32) {
      console.error('OTP: secreto ausente o demasiado corto.');
      return out(false, 'SECRET_NOT_CONFIGURED');
    }

    // 4. Comprobar firma HMAC-SHA256.
    var message = [
      d.to,
      d.type,
      d.code,
      d.ts,
      d.nonce
    ].join('|');

    var expected = toHex(
      Utilities.computeHmacSha256Signature(message, secret)
    );

    if (!safeEqual(expected, d.sig)) {
      return out(false, 'INVALID_SIGNATURE');
    }

    // 5. Comprobar antigüedad de la solicitud.
    var timestamp = Number(d.ts);

    if (
      !Number.isSafeInteger(timestamp) ||
      Math.abs(Date.now() - timestamp) > MAX_SKEW_MS
    ) {
      return out(false, 'EXPIRED_REQUEST');
    }

    // 6. Comprobar y reservar el nonce de forma protegida.
    lock = LockService.getScriptLock();

    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
      lock = null;
      return out(false, 'LOCK_TIMEOUT');
    }

    var cache = CacheService.getScriptCache();
    var nonceKey = 'n:' + d.nonce;

    if (cache.get(nonceKey)) {
      lock.releaseLock();
      lock = null;
      return out(false, 'REPLAYED_NONCE');
    }

    // Reservar nonce antes del envío.
    cache.put(nonceKey, '1', NONCE_TTL_S);

    lock.releaseLock();
    lock = null;

    // 7. Enviar correo.
    try {
      MailApp.sendEmail({
        to: d.to,
        subject: SUBJECTS[d.type],
        name: APP_NAME,
        htmlBody: buildHtml(d.type, d.code),
        body:
          INTROS[d.type] +
          '\n\n' +
          d.code +
          '\n\n' +
          'Este código vence en 10 minutos. ' +
          'No lo compartas con nadie. ' +
          APP_NAME +
          ' nunca te lo pedirá por chat ni por teléfono.\n\n' +
          'Si no solicitaste este código, ignora este mensaje.'
      });

    } catch (mailError) {
      // No registrar dirección, código ni contenido del correo.
      console.error(
        'OTP MAIL_SEND_FAILED: ' +
        (mailError && mailError.name
          ? mailError.name
          : 'UnknownError')
      );

      return out(false, 'MAIL_SEND_FAILED');
    }

    console.info('OTP: correo aceptado por MailApp.');

    return out(true, 'SENT');

  } catch (err) {
    console.error(
      'OTP INTERNAL_ERROR: ' +
      (err && err.name ? err.name : 'UnknownError')
    );

    return out(false, 'INTERNAL_ERROR');

  } finally {
    // Liberar bloqueo si hubo una excepción inesperada.
    if (lock) {
      try {
        lock.releaseLock();
      } catch (releaseError) {
        console.error('OTP: no se pudo liberar el bloqueo.');
      }
    }
  }
}


/**
 * Validar estructura y formato.
 */
function isValidShape(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) {
    return false;
  }

  return (
    typeof d.to === 'string' &&
    d.to.length <= 254 &&
    /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/.test(d.to) &&

    (
      d.type === 'verify_email' ||
      d.type === 'reset_password'
    ) &&

    typeof d.code === 'string' &&
    /^\d{6}$/.test(d.code) &&

    typeof d.ts === 'string' &&
    /^\d{13}$/.test(d.ts) &&

    typeof d.nonce === 'string' &&
    /^[a-f0-9]{32}$/.test(d.nonce) &&

    typeof d.sig === 'string' &&
    /^[a-f0-9]{64}$/.test(d.sig)
  );
}


/**
 * Construir correo HTML.
 */
function buildHtml(type, code) {
  return (
    '<div style="' +
      'font-family:Arial,sans-serif;' +
      'max-width:440px;' +
      'margin:auto;' +
      'padding:28px;' +
      'color:#1b1f3b;' +
    '">' +

      '<h2 style="' +
        'margin:0 0 18px;' +
        'color:#6846e8;' +
      '">' +
        APP_NAME +
      '</h2>' +

      '<p style="font-size:15px;line-height:1.6;">' +
        INTROS[type] +
      '</p>' +

      '<div style="' +
        'background:#f3efff;' +
        'border-radius:14px;' +
        'padding:20px;' +
        'text-align:center;' +
        'margin:22px 0;' +
      '">' +

        '<p style="' +
          'font-size:32px;' +
          'letter-spacing:8px;' +
          'font-weight:bold;' +
          'color:#6846e8;' +
          'margin:0;' +
        '">' +
          code +
        '</p>' +

      '</div>' +

      '<p style="font-size:14px;color:#555;line-height:1.6;">' +
        'Este código vence en 10 minutos. ' +
        'No lo compartas con nadie: ' +
        APP_NAME +
        ' nunca te lo pedirá por chat ni por teléfono.' +
      '</p>' +

      '<p style="font-size:12px;color:#888;margin-top:24px;">' +
        'Si no fuiste tú, ignora este mensaje.' +
      '</p>' +

    '</div>'
  );
}


/**
 * Convertir bytes a hexadecimal.
 */
function toHex(bytes) {
  return bytes.map(function (b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}


/**
 * Comparación de cadenas en tiempo constante
 * cuando tienen la misma longitud.
 */
function safeEqual(a, b) {
  if (
    typeof a !== 'string' ||
    typeof b !== 'string' ||
    a.length !== b.length
  ) {
    return false;
  }

  var diff = 0;

  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}


/**
 * Respuesta JSON uniforme.
 */
function out(ok, reason) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: ok,
      reason: reason || (ok ? 'SENT' : 'INTERNAL_ERROR')
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
