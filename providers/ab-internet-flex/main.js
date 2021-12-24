/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у ногинского интернет-провайдера Flex. Он осуществляет подключение клиентов к домовым сетям в населенных пунктах: Ногинск, Электросталь, Бахчиванджи, Электроугли, Орехово-Зуево, Ликино-Дулево, Давыдово, Демехово, Куровское, Селятино.

Сайт оператора: http://www.flex.ru/
Личный кабинет: https://www.flex.ru/stats/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36'
};

var baseurl = 'https://flex.ru/stats/';

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + '?auth', {
        login:prefs.login,
        password:prefs.password,
        act:'login'
    }, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': baseurl
    }));

    //AnyBalance.trace(html);
    if(!/\?logout/.test(html)){
        var error = getParam(html, null, null, /alert\('([^']*)/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + '?traffic', g_headers);

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счета\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Баланс лицевого счета\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'discount', /Скидка\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Зачтенный трафик с начала месяца\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'outgoing', /Исходящий \(от абонента\)[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'incoming', /Входящий \(к абоненту\)[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'limit', /Лимит[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'exceeding', /Превышение[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'remains', /Остаток[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
    getParam(html, result, 'licschet', /Код пользователя\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Действующий тарифный план\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'ip_address', /Привязка по IP адресу\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'username', /Имя пользователя\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
