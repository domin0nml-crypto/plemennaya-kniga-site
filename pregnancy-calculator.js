(() => {
  const widget = document.querySelector('[data-due-calculator]');
  if (!widget) return;

  const first = widget.querySelector('#first-mating');
  const last = widget.querySelector('#last-mating');
  const ovulation = widget.querySelector('#ovulation');
  const label = widget.querySelector('[data-result-label]');
  const value = widget.querySelector('[data-result-value]');
  const detail = widget.querySelector('[data-result-detail]');
  const idleLabel = label.textContent;
  const idleValue = value.textContent;
  const format = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });

  // Date inputs use UTC midnight. Calendar days stay consistent across time zones and DST.
  function dateAfter(input, days) {
    return format.format(input.valueAsNumber + days * 86_400_000);
  }

  function show(title, main, note = '') {
    label.textContent = title;
    value.textContent = main;
    detail.textContent = note;
  }

  function update() {
    const dates = widget.querySelectorAll('input[type="date"]');
    for (const input of dates) {
      input.removeAttribute('aria-invalid');
    }
    for (const input of dates) {
      if (!input.validity.valid || (input.value && !Number.isFinite(input.valueAsNumber))) {
        input.setAttribute('aria-invalid', 'true');
        show('Проверьте дату', 'Введите дату полностью');
        return;
      }
    }
    if (last.value && !first.value) {
      first.setAttribute('aria-invalid', 'true');
      show('Проверьте даты вязок', 'Укажите дату первой вязки');
      return;
    }
    if (last.valueAsNumber < first.valueAsNumber) {
      last.setAttribute('aria-invalid', 'true');
      show('Проверьте даты вязок', 'Последняя вязка указана раньше первой');
      return;
    }
    if (ovulation && ovulation.value) {
      show('Ориентир по овуляции', dateAfter(ovulation, 63),
        'Ориентировочный период щенения — с ' + dateAfter(ovulation, 61) + ' по ' + dateAfter(ovulation, 65) + '.');
      return;
    }
    if (!first.value) {
      show(idleLabel, idleValue);
      return;
    }
    const end = last.value ? last : first;
    if (widget.dataset.dueCalculator === 'cat') {
      show('Ориентир по первой вязке', dateAfter(first, 65),
        'Ориентировочный период родов — с ' + dateAfter(first, 63) + ' по ' + dateAfter(end, 68) + '.');
    } else {
      show('Ориентировочный период щенения', dateAfter(first, 58) + ' — ' + dateAfter(end, 72),
        'Диапазон рассчитан по датам вязок. Известная дата овуляции уточнит расчёт.');
    }
  }

  widget.addEventListener('input', update);
  widget.addEventListener('change', update);
  window.addEventListener('pageshow', update);
  update();

  const copy = widget.querySelector('[data-copy-link]');
  const link = widget.querySelector('[data-permalink]');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      const status = widget.querySelector('[data-copy-status]');
      try {
        await navigator.clipboard.writeText(link.href);
        status.textContent = 'Ссылка скопирована.';
      } catch {
        status.textContent = 'Скопируйте адрес через меню ссылки рядом.';
      }
    });
  }
})();
