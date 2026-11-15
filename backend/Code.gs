/**
 * Волинська приватна автошкола — безкоштовний бекенд на Google Apps Script.
 *
 *  POST  <url>                 → приймає заявку на навчання:
 *                                 записує в Google Таблицю, шле email і (опційно) Telegram.
 *  GET   <url>?action=reviews  → віддає рейтинг і відгуки з Google Maps (Places API New),
 *                                 кешує на 6 годин, щоб не витрачати квоту.
 *
 * Налаштування: Project Settings → Script Properties (ключ → значення):
 *   NOTIFY_EMAIL        пошта автошколи                (куди слати заявки)
 *   TG_BOT_TOKEN        123456:ABC...                   (необов'язково)
 *   TG_CHAT_ID          -100123456789                   (необов'язково)
 *   PLACES_API_KEY      AIza...                         (для відгуків)
 *   PLACE_ID            ChIJ...                         (можна знайти функцією findPlaceId)
 *
 * Деталі — у README.md.
 */

const SHEET_NAME = 'Заявки';
const HEADERS = ['Дата', 'Ім\'я', 'Телефон', 'Послуги', 'Зв\'язок', 'Сторінка', 'Статус'];

function props_() { return PropertiesService.getScriptProperties(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function clean_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200); }

/* ======================= ЗАЯВКИ ======================= */
function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return json_({ ok: true }); // honeypot — бот

    const row = {
      name: clean_(d.name, 80),
      phone: clean_(d.phone, 25),
      services: clean_(d.services, 300),
      via: clean_(d.via, 20),
      page: clean_(d.page, 200),
    };
    if (row.name.length < 2) return json_({ ok: false, error: 'name' });
    if (!/^380\d{9}$/.test(row.phone.replace(/\D/g, ''))) return json_({ ok: false, error: 'phone' });
    if (!row.services) return json_({ ok: false, error: 'services' });

    // простий захист від флуду: не більше 1 заявки з того ж номера за 2 хвилини
    const cache = CacheService.getScriptCache();
    const key = 'p' + row.phone.replace(/\D/g, '');
    if (cache.get(key)) return json_({ ok: true, dup: true });
    cache.put(key, '1', 120);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = sheet_();
      sh.appendRow([new Date(), row.name, "'" + row.phone, row.services, row.via, row.page, 'Нова']);
    } finally { lock.releaseLock(); }

    const text =
      '🚗 Нова заявка на навчання\n\n' +
      '👤 ' + row.name + '\n' +
      '📞 ' + row.phone + ' (' + row.via + ')\n' +
      '📋 ' + row.services;

    notifyEmail_(row, text);
    notifyTelegram_(text);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

function sheet_() {
  let ss;
  const id = props_().getProperty('SHEET_ID');
  if (id) ss = SpreadsheetApp.openById(id);
  else {
    ss = SpreadsheetApp.create('Автошкола — заявки на навчання');
    props_().setProperty('SHEET_ID', ss.getId());
  }
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e31e24').setFontColor('#ffffff');
    const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Аркуш1');
    if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  }
  return sh;
}

function notifyEmail_(row, text) {
  const to = props_().getProperty('NOTIFY_EMAIL');
  if (!to) return;
  try {
    MailApp.sendEmail({ to: to, subject: 'Заявка: ' + row.name + ' — ' + row.services, body: text + '\n\nУсі заявки: ' + sheet_().getParent().getUrl() });
  } catch (e) { console.error('mail', e); }
}

function notifyTelegram_(text) {
  const token = props_().getProperty('TG_BOT_TOKEN'), chat = props_().getProperty('TG_CHAT_ID');
  if (!token || !chat) return;
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: chat, text: text }),
    });
  } catch (e) { console.error('tg', e); }
}

/* ======================= ВІДГУКИ GOOGLE ======================= */
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'reviews') return json_(reviews_());
  return json_({ ok: true, service: 'forsazh' });
}

function reviews_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('reviews_v1');
  if (hit) return JSON.parse(hit);

  const key = props_().getProperty('PLACES_API_KEY'), placeId = props_().getProperty('PLACE_ID');
  if (!key || !placeId) return { ok: false, error: 'not-configured' };

  const res = UrlFetchApp.fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId) + '?languageCode=uk', {
    muteHttpExceptions: true,
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri,googleMapsLinks',
    },
  });
  if (res.getResponseCode() !== 200) {
    console.error(res.getContentText());
    return { ok: false, error: 'places-' + res.getResponseCode() };
  }
  const p = JSON.parse(res.getContentText());
  const out = {
    ok: true,
    rating: p.rating || null,
    count: p.userRatingCount || 0,
    url: (p.googleMapsLinks && p.googleMapsLinks.reviewsUri) || p.googleMapsUri || '',
    writeUrl: (p.googleMapsLinks && p.googleMapsLinks.writeAReviewUri) || '',
    reviews: (p.reviews || []).map(function (r) {
      const a = r.authorAttribution || {};
      return {
        author: a.displayName || 'Користувач Google',
        authorUrl: a.uri || '',
        photo: a.photoUri || '',
        rating: r.rating || 0,
        when: r.relativePublishTimeDescription || '',
        text: (r.originalText && r.originalText.text) || (r.text && r.text.text) || '',
      };
    }),
  };
  cache.put('reviews_v1', JSON.stringify(out), 6 * 60 * 60);
  return out;
}

/** Запустіть один раз вручну (Run → findPlaceId), щоб дізнатися PLACE_ID — він з'явиться в журналі. */
function findPlaceId() {
  const key = props_().getProperty('PLACES_API_KEY');
  const res = UrlFetchApp.fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating' },
    payload: JSON.stringify({ textQuery: 'Волинська приватна автошкола', languageCode: 'uk' }),
  });
  console.log(res.getContentText());
}

/** Запустіть один раз, щоб надати доступи (пошта, таблиці, зовнішні запити) і створити таблицю. */
function setup() {
  console.log('Таблиця заявок: ' + sheet_().getParent().getUrl());
}
