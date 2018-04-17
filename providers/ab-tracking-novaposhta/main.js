/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
};

function main(){
	var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.trace('Connecting to novaposhta...');
	
	var baseurl = 'https://novaposhta.ua/ru/tracking';
	var html = AnyBalance.requestGet(baseurl + '/?cargo_number=' + encodeURIComponent(prefs.track_id), addHeaders({Origin:baseurl}));

	if (!/Маршрут/i.test(html)) {
        var error = getParam(html, null, null, /Текущее местоположение:?([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /не найден/i.test(html));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найден статус отправления. Неверный код отправления или произошли изменения на сайте.');
    }
     
	var result = {success: true};

    getParam(html, result, 'trackid', /(?:Результат пошуку[^№]+|Результат поиска[^№]+)(?:[№])([^<:]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'route', /Маршрут:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'location', /(?:Текущее местоположение|Поточне місцезнаходження):([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
    getParam(html, result, 'delivery_address', /(?:Адрес доставки|Адреса доставки):([\s\S]+?)<\/p>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
