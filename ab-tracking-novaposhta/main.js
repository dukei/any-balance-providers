/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления с сайта novaposhta.ua

Сайт оператора: http://novaposhta.ua
Личный кабинет: http://novaposhta.ua/frontend/tracking/ru
*/

var g_headers = {
	Accept:'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        Connection:'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
};

function main(){
	var prefs = AnyBalance.getPreferences();
        AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Connecting to novaposhta...');
	var id = prefs.track_id; //Код отправления, введенный пользователем

	var baseurl = "http://novaposhta.ua/frontend/tracking/ru";
	var html = AnyBalance.requestPost(baseurl, {
		'en':prefs.track_id
	}, addHeaders({Origin:baseurl}));

	if(!/<div[^>]+class="result"[^>]*>[^<]*<table/i.test(html)){
            //если нет таблицы с результатом, значит, вероятно, ошибка
            var error = getParam(html, null, null, /<div[^>]+class="result"[^>]*>[^<]*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                throw new AnyBalance.Error(error);
            throw new AnyBalance.Error('Не найден статус отправления. Неверный код отправления или произошли изменения на сайте.');
        }
     
	var result = {success: true};

        getParam(html, result, 'trackid', /(?:Результати пошуку за товарно-транспортною накладною №|Результаты поиска по товарно-транспортной накладной №)([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'route', /(?:Маршрут вантажу|Маршрут груза)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'expected', /(?:Дата прибуття|Дата прибытия)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'location', /(?:Текущее местоположение|Поточне місцезнаходження)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

        if(AnyBalance.isAvailable('fulltext')){
            var res = [];
            var dt = getParam(html, null, null, /(?:Дата прибуття|Дата прибытия)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            if(dt)
                res.push('Ожидается: <b>', dt, '</b><br/>');
            res.push(getParam(html, null, null, /(?:Текущее местоположение|Поточне місцезнаходження)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode));
            result.fulltext = res.join('');
        }

	AnyBalance.setResult(result);
}
