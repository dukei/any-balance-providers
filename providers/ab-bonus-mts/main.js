/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var loginurl = 'https://login.mts.ru/amserver/UI/Login';
	
	checkEmpty(prefs.login, 'Введите номер телефона');
	checkEmpty(prefs.password, 'Введите пароль');
	
	AnyBalance.trace('Trying to login at address: ' + loginurl);
	
	var loginfullurl = loginurl + '?service=bonus&goto=http%3A%2F%2Fwap.bonus.mts.ru%2Fru%2Fpmsdata.html%3Ftarget%3Dmts_bonus_wap%2Findex%2Fpersonal_page_html&auth-status=0';
	var html = AnyBalance.requestGet(loginfullurl);
	var form = getParam(html, null, null, /<form[^>]+name="Login"[^>]*>([\s\S]*?)<\/form>/i);
	if (!form) 
		throw new AnyBalance.Error("Не удалось найти форму входа, сайт изменен?");
	
	var params = createFormParams(form, function(params, input, name, value) {
		var undef;
		if (name == 'IDToken1') 
			value = prefs.login;
		else if (name == 'IDToken2')
			value = prefs.password;
		else if (name == 'noscript')
			value = undef; //Снимаем галочку
		else if (name == 'IDButton')
			value = 'Submit';
		
		return value;
	});
	var html = AnyBalance.requestPost(loginurl + "?service=bonus&goto=http%3A%2F%2Fwap.bonus.mts.ru%2Fru%2Fpmsdata.html%3Ftarget%3Dmts_bonus_wap%2Findex%2Fpersonal_page_html", params, addHeaders({Referer: loginfullurl}));
	
	if (!/\/amserver\/UI\/Logout/i.test(html)) {
		var error;
		try {
			var error = sumParam(html, null, null, /<i[^>]+class="auth-error-text"[^>]*>([\s\S]*?)<\/i>/ig, replaceTagsAndSpaces, html_entity_decode, function(arr) {
				return aggregate_join(arr).replace(/^(\s*,)+\s*|\s*(,\s*)+$/g, '').replace(/,(\s*,)+/g, ',')
			});
			if (error) 
				throw new AnyBalance.Error(error);
		} catch (e) {}
		
		error = getParam(html, null, null, /<div[^>]+class="msg_error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error(error);
		
		error = getParam(html, null, null, /(authErr)/i);
		if (error)
			throw new AnyBalance.Error("Ошибка авторизации. Проверьте логин и пароль.");
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	AnyBalance.trace('It looks like we are in selfcare...');
	
	var result = {success: true};
	
	getParam(html, result, 'customer', /Ваш номер телефона:\s*(\d+)/i);
	getParam(html, result, 'balance', /Баланс:\s*(\d+)/i, null, parseBalance);
	getParam(html, result, 'lifeInProgram', /(Стаж в программе:\s*(?:(\d+)\s*год[^\s]*)?\s*(?:(\d+)\s*месяц[^\s]*)?\s*(?:(\d+)\s*(?:день|дня|дней))?)/i);
	
	if (result.lifeInProgram) {
		result.lifeInProgram = result.lifeInProgram.replace(/Стаж в программе:\s*/i, '');
		result.lifeInProgram = result.lifeInProgram.replace(/[\s]*год[^\s]*[\s]*/i, 'г ');
		result.lifeInProgram = result.lifeInProgram.replace(/[\s]*месяц[^\s]*[\s]*/i, 'мес ');
		result.lifeInProgram = result.lifeInProgram.replace(/[\s]*(день|дня|дней)[\s]*/i, 'дн ');
	}
	AnyBalance.setResult(result);
}