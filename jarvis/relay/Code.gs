/**
 * Jarvis relay — Google Apps Script web app.
 * Keeps the Anthropic API key on Google's side; the Jarvis page only sends the
 * conversation and a passcode.
 *
 * Script Properties (Project Settings → Script properties):
 *   ANTHROPIC_API_KEY  your key from console.anthropic.com
 *   PASSCODE           any secret word; the page must send the same one
 *   MODEL              optional, defaults to claude-opus-5-5
 */
var DEFAULT_MODEL = 'claude-opus-5-5';

function doGet() {
  return json_({ ok: true, status: 'Jarvis relay is running' });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var props = PropertiesService.getScriptProperties();
    var key = props.getProperty('ANTHROPIC_API_KEY');
    var pass = props.getProperty('PASSCODE');
    if (!key) return json_({ ok: false, error: 'no_key' });
    if (!pass || req.pass !== pass) return json_({ ok: false, error: 'bad_pass' });

    var messages = (Array.isArray(req.messages) ? req.messages : [])
      .filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim(); })
      .slice(-30)
      .map(function (m) { return { role: m.role, content: m.content.slice(0, 8000) }; });
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== 'user') return json_({ ok: false, error: 'bad_request' });

    var body = {
      model: props.getProperty('MODEL') || DEFAULT_MODEL,
      max_tokens: 2048,
      system: String(req.system || '').slice(0, 20000),
      messages: messages,
      output_config: { effort: 'low' },   // quick answers for voice
      fallbacks: 'default'                 // retry on another model if a safety check declines
    };
    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01'
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var data = JSON.parse(res.getContentText() || '{}');
    if (code !== 200) {
      var type = data && data.error && data.error.type;
      return json_({ ok: false, error: code === 429 ? 'rate_limited' : (code === 401 ? 'bad_key' : 'api_error'), detail: type || String(code) });
    }
    if (data.stop_reason === 'refusal') return json_({ ok: false, error: 'refused' });
    var text = (data.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('').trim();
    if (!text) return json_({ ok: false, error: 'empty' });
    return json_({ ok: true, text: text, truncated: data.stop_reason === 'max_tokens' });
  } catch (err) {
    return json_({ ok: false, error: 'relay_error', detail: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
