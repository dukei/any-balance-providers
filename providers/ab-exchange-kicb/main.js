/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};


function main() {
    var baseurl = 'http://kicb.net/welcome/';
    AnyBalance.setDefaultCharset('windows-1251');

    var html = AnyBalance.requestGet(baseurl, g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400)
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

    var result = {success: true};

    var currency = getElement(html, /<div[^>]+id="curency"[^>]*>/i);

    if (!currency)
        throw new AnyBalance.Error('Не удалось найти таблицу с валютами, сайт изменен?');

    var currency_blocks = currency.split("<div class='con'>");

    for (var j = 0; j < currency_blocks.length; j++) {
        var isCash = null;
        if (currency_blocks[j].match(/безнал/i)) {
            isCash = 'cashless';
        } else if (currency_blocks[j].match(/нал/i)) {
            isCash = 'cash';
        } else continue;
        var lines = currency_blocks[j].split("<div  class='cur_line'>");
        for (var i = 0; i < lines.length; i++) {
            var currency_type = null;
            if (lines[i].match(/USD/)) {
                currency_type = 'usd';
            } else if (lines[i].match(/EUR/)) {
                currency_type = 'eur';
            } else if (lines[i].match(/RUB/)) {
                currency_type = 'rub';
            } else if (lines[i].match(/KZT/)) {
                currency_type = 'kzt';
            } else continue;
            var currency_values = lines[i].match(/<span >([\s\S]*?)<img/ig);
            getParam(currency_values[0], result, isCash + '_' + currency_type + '_buy', null,[/data2/,'',/[^.\d]/g, '']);
            getParam(currency_values[1], result, isCash + '_' + currency_type + '_sell', null,[/data2/,'',/[^.\d]/g, '']);
        }
    }

    AnyBalance.setResult(result);
}