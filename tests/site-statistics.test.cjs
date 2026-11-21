const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const origin = 'https://breedbook.ru';
const key = 'breedbook_site_statistics_v1';

class Element {
  constructor() { this.listeners = {}; this.children = new Map(); this.attributes = new Map(); }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  setAttribute(key, value) { this.attributes.set(key, value); }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new Element());
    return this.children.get(selector);
  }
  fire(type, event = {}) { this.listeners[type]?.(event); }
  remove() { this.removed = true; }
  focus() { this.focused = true; }
}
function newPage() {
  const document = new Element(), window = new Element(), mounted = [], messages = [];
  const stored = new Map(), documentRequests = [];
  const location = new URL(origin + '/cats.html?utm_source=vk&customer=private#private');
  document.body = {append(el) { mounted.push(el); }};
  document.referrer = 'https://private.example/client?name=private';
  document.createElement = tag => {
    const el = new Element();
    el.tag = tag;
    if (tag === 'iframe') el.contentWindow = {postMessage(msg) { documentRequests.push(msg); }};
    return el;
  };
  class MessageChannel {
    constructor() {
      this.port1 = {close(){}, postMessage(message) { messages.push(message); }};
      this.port2 = {};
    }
  }
  window.MessageChannel = MessageChannel;
  const navigator = {onLine:true}, localStorage = {
    getItem:k => stored.get(k) ?? null, setItem:(k,v) => stored.set(k,v)
  };
  vm.runInNewContext(read('assets/site-statistics.js'), {window,document,location,navigator,localStorage,
    URL,URLSearchParams,MessageChannel,setTimeout,clearTimeout});
  return {document, window, stored, messages, location, navigator, documentRequests,
    settings:document.querySelector('[data-statistics-settings]'), panel:mounted[0], frames:()=>mounted.filter(e=>e.tag==='iframe'&&!e.removed)};
}
function action(type, env) {
  const link = Object.assign(new URL('https://plemennaya-kniga-dogs-larisa.website.yandexcloud.net/#dashboard'), {target:'_blank',hasAttribute:()=>false});
  env.document.fire('click', {target:{closest:()=>link}, defaultPrevented:false, button:0, ...type});
}

test('Все 12 публичных страниц предлагают выбор, проверочные файлы поисковиков остаются без счётчика', () => {
  const pages = [...read('sitemap.xml').matchAll(/<loc>https:\/\/breedbook\.ru\/([^<]*)<\/loc>/g)].map(m=>m[1]||'index.html');
  assert.equal(pages.length,12);
  for (const page of pages) {
    const html = read(page);
    assert.equal((html.match(/src="assets\/site-statistics\.js"/g)||[]).length,1,page);
    assert.equal((html.match(/data-statistics-settings/g)||[]).length,1,page);
    assert.doesNotMatch(html,/mc\.yandex\.ru|<noscript>\s*<img/i,page);
  }
  for (const file of fs.readdirSync(root).filter(name=>/^(google|yandex_).*\.html$/.test(name))) {
    assert.doesNotMatch(read(file),/statistics|metrika/i);
  }
});

test('Отказ, сохранение выбора, согласие, офлайн и отзыв в другой вкладке', () => {
  const env = newPage();
  assert.equal(env.panel.hidden,false);
  assert.equal(env.frames().length,0);
  action({},env);
  assert.deepEqual(env.messages,[]);
  env.panel.querySelector('[data-decline]').fire('click');
  assert.equal(JSON.parse(env.stored.get(key)).choice,'decline');
  assert.equal(env.frames().length,0);
  env.settings.fire('click'); env.panel.querySelector('[data-allow]').fire('click');
  const [frame] = env.frames();
  assert.equal(frame.referrerPolicy,'no-referrer');
  frame.onload();
  assert.equal(env.documentRequests[0].page,'/cats.html'); assert.equal(env.documentRequests[0].source,'vk');
  assert.doesNotMatch(JSON.stringify(env.documentRequests),/private/);
  action({},env); assert.deepEqual(env.messages,['site_open_dogs']);
  env.navigator.onLine=false; env.window.fire('offline'); action({},env);
  assert.equal(env.frames().length,0); assert.equal(env.messages.length,1);
  env.navigator.onLine=true; env.window.fire('online');
  assert.equal(env.frames().length,1); assert.equal(env.messages.length,1);
  env.stored.set(key,JSON.stringify({choice:'decline'})); env.window.fire('storage',{key});
  assert.equal(env.frames().length,0);
  env.window.fire('pageshow',{persisted:true}); assert.equal(env.frames().length,0);
});

test('Фрейм принимает только канал сайта и известные пути и цели', () => {
  const scripts = [], window = new Element(), parent = {}, port = {close(){},postMessage(){}};
  window.parent = parent; window.removeEventListener=(name)=>delete window.listeners[name];
  const document = {head:{append:s=>scripts.push(s)},createElement:()=>({})};
  vm.runInNewContext(read('assets/statistics-frame.js'), {window,document,location:new URL(origin),navigator:{onLine:true}});
  const valid = {origin,source:parent,ports:[port],data:{type:'breedbook-site-visit',page:'/install.html',source:'unknown/private'}};
  window.fire('message',{...valid,origin:'https://other.example'});
  window.fire('message',{...valid,source:{}});
  window.fire('message',{...valid,data:{...valid.data,page:'/cats.html?name=private'}});
  assert.equal(scripts.length,0);
  window.fire('message',valid);
  assert.equal(scripts.length,1); assert.match(scripts[0].src,/tag\.js\?id=114488135$/);
  port.onmessage({data:'private'}); port.onmessage({data:'site_open_cats'});
  const calls=Array.from(window.ym.a,x=>Array.from(x));
  assert.deepEqual(calls.map(c=>c[1]),['init','hit','reachGoal','reachGoal']);
  assert.equal(calls[1][2],origin+'/install.html'); assert.equal(calls[1][3].referer,'');
  assert.equal(calls[2][2],'site_install_guide'); assert.equal(calls[3][2],'site_open_cats');
  assert.equal(calls[0][2].webvisor,false); assert.equal(calls[0][2].trackLinks,false);
  assert.doesNotMatch(JSON.stringify(calls),/private/);
});
