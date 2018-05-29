
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
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.platformaofd.ru/web/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if(!prefs.dbg) {
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
		}

		var form = AB.getElement(html, /<form[^>]+login_form_id[^>]*>/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
		}

		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'j_username') {
				return prefs.login;
			} else if (name == 'j_password') {
				return prefs.password;
			}

			return value;
		});

		html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', params, AB.addHeaders({
			Referer: baseurl + 'login'
		}));

		if (!/logout/i.test(html)) {
			var error = AB.getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
			if (error) {
				throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
			}

			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}
	
	html = AnyBalance.requestGet(baseurl + 'auth/organization', g_headers);
	
	var result = {success: true};

	AB.getParam(html, result, '__tariff', /account-user-span[^>]*>([\s\S]+?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'ogrn', /orgOgrn[^>]*value="([^"]+)"/i, AB.replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable(['balance', 'balance_cash', 'balance_acquiring'])) {
		var date = new Date();
		var day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
		var month = date.getMonth()+1 < 10 ? '0' + (date.getMonth()+1) : (date.getMonth()+1);
		var year = date.getFullYear();
		html = AnyBalance.requestGet(baseurl + 'auth/cheques?start=' + day + '.' + month + '.' + year + '&end=' + day + '.' + month + '.' + year, g_headers);
	
		AB.getParam(html, result, ['balance_cash', 'balance'], /Оплата наличными[^>]*>([\s\S]+?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);	
		AB.getParam(html, result, ['balance_acquiring', 'balance'], /Оплата картой[^>]*>([\s\S]+?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);	
		AB.getParam(result.balance_acquiring + result.balance_cash, result, 'balance');	
	}
	
	AnyBalance.setResult(result);
}