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

	var baseurl = "http://novaposhta.ua/tracking";
	var html = AnyBalance.requestPost(baseurl, {
		'cargo_number': prefs.track_id
	}, addHeaders({Origin:baseurl}));

	if(/не найден|не знайдено/i.test(html)){
            var error = getParam(html, null, null, /class="response"[^<]([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                throw new AnyBalance.Error(error);
            throw new AnyBalance.Error('Не найден статус отправления. Неверный код отправления или произошли изменения на сайте.');
        }
     
	var result = {success: true};

        getParam(html, result, 'trackid', /(?:Результат пошуку[^№]+|Результат поиска[^№]+)(?:[№])([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'route', /Маршрут:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'location', /(?:Текущее местоположение:|Поточне місцезнаходження:)([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'back', /Обратная доставка:|Зворотна доставка:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'weight', /Вес отправления:|Вага відправлення:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'payment', /Сумма к оплате:|Сума до сплати:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);     

        // if(AnyBalance.isAvailable('fulltext')){
            // var res = [];
            // var dt = getParam(html, null, null, /(?:Дата прибуття|Дата прибытия)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            // if(dt)
                // res.push('Ожидается: <b>', dt, '</b><br/>');
            // res.push(getParam(html, null, null, /(?:Текущее местоположение:|Поточне місцезнаходження:)([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode));
            // result.fulltext = res.join('');
        // }

	AnyBalance.setResult(result);
}
