"""Keep storefront buttons aligned with the public payment gateway."""

import json
from pathlib import Path
import sys
from urllib.request import urlopen

API = "https://d5dssrts8ngmgc3oek58.nkhmighe.apigw.yandexcloud.net"
BOOKS = {
    "cats": "https://plemennaya-kniga-larisa.website.yandexcloud.net/",
    "dogs": "https://plemennaya-kniga-dogs-larisa.website.yandexcloud.net/",
}
PLACEHOLDER = '<p class="pro-status">Продажи готовятся</p>'


def prepare(root, config):
    if config.get("mode") != "live":
        raise ValueError("Не найден действующий платёжный шлюз.")
    if config.get("pilot") is True:
        return
    if config.get("books") != BOOKS:
        raise ValueError("Платёжный шлюз вернул другие адреса книг.")

    for sku in BOOKS:
        path = root / f"{sku}.html"
        html = path.read_text(encoding="utf-8")
        if html.count(PLACEHOLDER) != 1:
            raise ValueError(f"{path.name}: не найден блок покупки.")
        link = (f'<p class="pro-status"><a class="button" href="{API}/checkout/{sku}">'
                'Купить Pro за 500 ₽</a></p>')
        vpn_note = "<p>Перед оплатой отключите VPN. С ним может не открыться страница оплаты или подтверждения банка.</p>"
        html = html.replace(PLACEHOLDER, vpn_note + "\n      " + link)
        html = html.replace("Условия будущей платной лицензии:", "Условия лицензии и возврата:")
        path.write_text(html.replace(" Оплата пока не подключена.", ""), encoding="utf-8")


if __name__ == "__main__":
    with urlopen(API + "/public-config", timeout=15) as response:
        config = json.load(response)
    prepare(Path(sys.argv[1]), config)
