(() => {
  'use strict';
  const origin = 'https://breedbook.ru';
  const counter = 114488135; // Public website only.
  if (location.origin !== origin || window.parent === window) return;
  const pages = new Set(['/', '/cats.html', '/dogs.html', '/guide.html', '/install.html', '/records.html',
    '/backup.html', '/update.html', '/troubleshooting.html', '/privacy.html', '/terms.html', '/offer.html']);
  const referrers = new Map([['vk','https://vk.ru/'], ['telegram','https://t.me/'], ['max','https://max.ru/'],
    ['facebook','https://www.facebook.com/'], ['google','https://www.google.com/'], ['yandex','https://yandex.ru/']]);
  const bookGoals = new Set(['site_open_cats', 'site_open_dogs']);
  const pageGoals = new Map([['/guide.html','site_guides'], ['/install.html','site_install_guide']]);
  window.addEventListener('message', function connect(event) {
    const data = event.data;
    if (event.origin !== origin || event.source !== window.parent || event.ports.length !== 1 ||
        data?.type !== 'breedbook-site-visit' || !pages.has(data.page) || navigator.onLine === false) return;
    window.removeEventListener('message', connect);
    const port = event.ports[0];
    const ym = window.ym = function () { (ym.a = ym.a || []).push(arguments); };
    ym.l = Date.now();
    const url = origin + data.page;
    const referrer = pages.has(data.source) ? origin + data.source : (referrers.get(data.source) || '');
    ym(counter, 'init', {defer:true, url, referrer:'', sendTitle:false, webvisor:false, clickmap:false,
      trackLinks:false, trackHash:false, accurateTrackBounce:false, ecommerce:false, disableYtm:true});
    ym(counter, 'hit', url, {title:data.page, referer:referrer});
    if (pageGoals.has(data.page)) ym(counter, 'reachGoal', pageGoals.get(data.page));
    port.onmessage = ({data:goal}) => {
      if (bookGoals.has(goal) && navigator.onLine !== false) ym(counter, 'reachGoal', goal, {}, () => port.postMessage('sent'));
    };
    const tag = document.createElement('script');
    tag.async = true;
    tag.referrerPolicy = 'no-referrer';
    tag.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + counter;
    tag.onerror = () => { ym.a = []; port.close(); };
    document.head.append(tag);
  });
})();
