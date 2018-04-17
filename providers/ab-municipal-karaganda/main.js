/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.kzs.kz';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/ru/auth/login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var captchaSRC = AB.getParam(html, null, null, /Введите символы, нарисованные на картинке[\s\S]*?<img[^>]+src="([\s\S]*?)"/i);
	if(!captchaSRC)
		throw  new AnyBalance.Error("Не удалось получить капчу. Сайт изменён?");

	var captchaIMG = AnyBalance.requestGet(baseurl+captchaSRC);
	var captcha = AnyBalance.retrieveCode("Введите код с картинки.", captchaIMG);
	
	html = AnyBalance.requestPost(baseurl + '/ru/auth/login/', {
		login: prefs.login,
		pass: prefs.password,
		captcha: captcha
	}, AB.addHeaders({Referer: baseurl + '/ru/auth/login/'}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<h4[^>]+class="alert-heading"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /(Пользователь с таким именем не найден|Проверочный код введен неверно)/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'electroBalance', /Баланс(?:[\s\S]*?<td[^>]+class="td_saldo"[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'tepBalance', /Баланс(?:[\s\S]*?<td[^>]+class="td_saldo"[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'electroAcc', /<table[^>]+class="table_account"[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'tepAcc', /<table[^>]+class="table_account"[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'fio', /<div[^>]+class="main_content"[^>]*>([\s\S]*?)<div/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /sep_info_abonent(?:[\s\S]*?<tr[^>]*>)([\s\S]*?)<\/tr>/i, AB.replaceTagsAndSpaces);

	
	AnyBalance.setResult(result);
}