window.APP_URL = 'https://script.google.com/macros/s/AKfycbyCSIZC0pYp3qwtMHCKoqrgg4anLdmnrHB--PhhsIt4M3JsxEdbbpyrXFOxIQhHN4zdlA/exec';
/* بالكمبيوتر: يفتح النظام مباشرة بدل ما يفتحه داخل التطبيق */
(function(){ var m = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)); if (!m) { var u = window.APP_URL; try { u = localStorage.getItem('app_url') || u; } catch (e) {} location.replace(u); } })();
