/* Optional statistics on the public website. The two books have their own counters. */
(() => {
  'use strict';
  const origin = 'https://breedbook.ru';
  if (location.origin !== origin) return;
  const choiceKey = 'breedbook_site_statistics_v1';
  const settings = document.querySelector('[data-statistics-settings]');
  if (!settings) return;
  const page = location.pathname === '/index.html' ? '/' : location.pathname;
  const bookGoals = new Map([
    ['https://plemennaya-kniga-larisa.website.yandexcloud.net', 'site_open_cats'],
    ['https://plemennaya-kniga-dogs-larisa.website.yandexcloud.net', 'site_open_dogs']
  ]);
  const sources = [
    ['vk.com', 'vk'], ['vk.ru', 'vk'], ['t.me', 'telegram'], ['telegram.me', 'telegram'],
    ['max.ru', 'max'], ['facebook.com', 'facebook'], ['google.com', 'google'],
    ['google.ru', 'google'], ['yandex.ru', 'yandex'], ['ya.ru', 'yandex']
  ];
  const tags = new Map([['vk','vk'], ['vkontakte','vk'], ['tg','telegram'], ['telegram','telegram'],
    ['fb','facebook'], ['facebook','facebook'], ['max','max'], ['yandex','yandex'], ['google','google']]);
  let choice = readChoice();
  let frame, port, finishNavigation;
  let openedFromSettings = false;

  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(choiceKey))?.choice;
      return value === 'allow' || value === 'decline' ? value : null;
    } catch { return null; }
  }
  function source() {
    const tag = new URLSearchParams(location.search).get('utm_source');
    if (tag && tags.has(tag.toLowerCase())) return tags.get(tag.toLowerCase());
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === origin) return ref.pathname;
      return sources.find(([domain]) => ref.hostname === domain || ref.hostname.endsWith('.' + domain))?.[1] || '';
    } catch { return ''; }
  }
  function stop() {
    port?.close();
    port = null;
    if (frame) {
      frame.onload = null;
      frame.remove();
      frame = null;
    }
  }
  function start() {
    if (frame || choice !== 'allow' || navigator.onLine === false || !window.MessageChannel) return;
    const channel = new MessageChannel();
    const next = document.createElement('iframe');
    next.hidden = true;
    next.title = 'Статистика сайта';
    next.tabIndex = -1;
    next.setAttribute('aria-hidden', 'true');
    next.setAttribute('sandbox', 'allow-same-origin allow-scripts');
    next.referrerPolicy = 'no-referrer';
    next.src = '/assets/statistics-frame.html';
    next.onload = () => {
      if (next === frame && choice === 'allow' && navigator.onLine !== false) {
        next.contentWindow.postMessage({type:'breedbook-site-visit', page, source:source()}, origin, [channel.port2]);
      }
    };
    frame = next;
    port = channel.port1;
    port.onmessage = event => { if (event.data === 'sent') finishNavigation?.(); };
    document.body.append(next);
  }

  const panel = document.createElement('aside');
  panel.id = 'site-statistics-choice';
  panel.className = 'site-statistics-panel';
  panel.setAttribute('aria-labelledby', 'site-statistics-title');
  panel.innerHTML = '<strong id="site-statistics-title">Разрешить статистику сайта?</strong>' +
    '<p>Яндекс Метрика помогает понять, какие инструкции читают заводчики и какую книгу открывают. С вашего разрешения Яндекс получит технические данные о посещении и сможет использовать cookie. <a href="/privacy.html#metrics">Подробнее о данных</a></p>' +
    '<p data-choice-status></p><div class="site-statistics-actions"><button type="button" data-allow>Разрешить статистику</button><button type="button" data-decline>Без статистики</button></div>';
  const allow = panel.querySelector('[data-allow]');
  function show(visible) {
    panel.hidden = !visible;
    settings.setAttribute('aria-expanded', String(visible));
    const status = panel.querySelector('[data-choice-status]');
    status.textContent = choice === 'allow' ? 'Сейчас статистика включена.' : choice === 'decline' ? 'Сейчас статистика выключена.' : '';
  }
  function apply() {
    if (choice === 'allow') start(); else stop();
    show(!choice);
  }
  function choose(value) {
    choice = value;
    try { localStorage.setItem(choiceKey, JSON.stringify({choice:value, date:new Date().toISOString()})); } catch { /* Still applies until the page closes. */ }
    apply();
    if (openedFromSettings) settings.focus();
    openedFromSettings = false;
  }
  settings.hidden = false;
  settings.setAttribute('aria-controls', panel.id);
  settings.addEventListener('click', () => { openedFromSettings = true; show(true); allow.focus(); });
  allow.addEventListener('click', () => choose('allow'));
  panel.querySelector('[data-decline]').addEventListener('click', () => choose('decline'));
  document.body.append(panel);
  apply();

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || !port || choice !== 'allow' || navigator.onLine === false) return;
    const goal = link.pathname === '/' && bookGoals.get(link.origin);
    if (!goal) return;
    port.postMessage(goal);
    if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey ||
        (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    event.preventDefault();
    if (finishNavigation) return;
    const timer = setTimeout(navigate, 250);
    function navigate() {
      if (!finishNavigation) return;
      finishNavigation = null;
      clearTimeout(timer);
      location.assign(link.href);
    }
    finishNavigation = navigate;
  });
  window.addEventListener('storage', event => {
    if (event.key === choiceKey || event.key === null) { choice = readChoice(); apply(); }
  });
  window.addEventListener('offline', stop);
  window.addEventListener('online', start);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted) { choice = readChoice(); apply(); } });
})();
