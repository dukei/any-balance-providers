/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о предоплаченной карте в банке "Русский Стандарт".

Сайт: https://cardlimit.rsb.ru (вход с  http://www.rsb.ru/cards/virtual_card/, ссылка Проверка лимита)
*/

function main() {
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
        var baseurl = 'https://cardlimit.rsb.ru/';

        var card_parts = (prefs.login || '').match(/^(\d{4})(\d{4})(\d{4})(\d{4})$/);
        var card_till = (prefs.till || '').match(/^(\d+)\D(\d+)$/);
        if(!card_parts)
            throw new AnyBalance.Error('Пожалуйста, введите 16 цифр номера предоплаченной карты без пробелов и разделителей');
        if(!card_till)
            throw new AnyBalance.Error('Пожалуйста, введите срок действия предоплаченной карты в формате ММ/ГГ, например, 05/14');

	var html = AnyBalance.requestPost(baseurl + 'result.php', {
                submitted:true,
                card_type:'virt',
                client_code1:card_parts[1],
                client_code2:card_parts[2],
                client_code3:card_parts[3],
                client_code4:card_parts[4],
                month:card_till[1],
		year:card_till[2],
		submit_short:'.'
	}, {
                'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
                'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
                'Cache-Control':'max-age=0',
                'Connection':'keep-alive',
		'Origin':baseurl.replace(/\/$/, ''),
		'Referer':baseurl,
		'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17'
        });

	if(!/<th[^>]*>\s*Платежный лимит/i.test(html)){
            var error = getParam(html, null, null, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                throw new AnyBalance.Error(error);
	    throw new AnyBalance.Error('Не удалось получить информацию по карте. Проблемы на сайте или сайт изменен.');
        }

        var result = {success: true};

        getParam(html, result, 'balance', /<th[^>]*>\s*Платежный лимит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, ['currency', 'balance'], /<th[^>]*>\s*Платежный лимит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        getParam(html, result, 'num', /<th[^>]*>\s*Номер Предоплаченной карты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, '__tariff', /<th[^>]*>\s*Номер Предоплаченной карты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'till', /<th[^>]*>\s*Срок окончания действия Предоплаченной карты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'type', /<th[^>]*>\s*Платежная система[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'lastopdate', /<th[^>]*>\s*Последние транзакции[\s\S]*?<td[^>]*>(?:(?:[\s\S](?!<\/td))*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDateISO);
        getParam(html, result, 'lastopdesc', /<th[^>]*>\s*Последние транзакции[\s\S]*?<td[^>]*>(?:(?:[\s\S](?!<\/td))*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'lastopsum', /<th[^>]*>\s*Последние транзакции[\s\S]*?<td[^>]*>(?:(?:[\s\S](?!<\/td))*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, ['lastopcur', 'lastopsum'], /<th[^>]*>\s*Последние транзакции[\s\S]*?<td[^>]*>(?:(?:[\s\S](?!<\/td))*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);

        AnyBalance.setResult(result);
}
