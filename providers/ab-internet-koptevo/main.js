/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по московскому интернет провайдеру Koptevo.net. Основными районами предоставления услуг 
доступа в интернет являются район Коптево, Войковский (м. Войковская), Тимирязевский 
(м. Тимирязевская), Печатники (м. Печатники).

Сайт оператора: http://www.koptevo.net
Личный кабинет: https://cp.koptevo.net/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};


function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://cp.koptevo.net/";

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+login-form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (/username/i.test(name)) {
			return prefs.login;
		} else if (/password/i.test(name)) {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'login', params, AB.addHeaders({
		Referer: baseurl + 'login'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.sumParam(html, /<p[^>]+error[^>]*>([\s\S]*?)<\/p>/ig, AB.replaceTagsAndSpaces, null, aggregate_join);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

    getParam(html, result, 'balance', /Состояние счета[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<th[^>]*>\s*Интернет[\s\S]*?<span[^>]*label[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'fio', /Ф.И.О.[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'agreement', /№ Договора[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'traffic');
        getParam(html, result, 'trafficIn', /title="Входящий"[^>]*>([\s\S]*?)(?:<i|<small|<\/div>)/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /title="Исходящий"[^>]*>([\s\S]*?)(?:<i|<small|<\/div>)/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    AnyBalance.setResult(result);
}
