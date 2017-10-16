/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.rostov.tns-e.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl+'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var captchaSRC = getParam(html, null, null, /<div[^>]+class="vpb_captcha_wrapper"[^>]*>[\s\S]*?<img src="([\s\S]*?)"/i);
	if (!captchaSRC)
		throw new AnyBalance.Error("Не удалось найти ссылку на капчу. Сайт изменён?");
	var captchaIMG = AnyBalance.requestGet(baseurl+captchaSRC, addHeaders({
			Accept: 'image/webp,image/*,*/*;q=0.8',
			Referer: 'https://lk.rostov.tns-e.ru/'
	}));
	if(captchaIMG) {
		var captchaResponse = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки.', captchaIMG);
		html = AnyBalance.requestPost(baseurl+'lib/js/captcha/captcha_checker.php', {
			vpb_captcha_code:captchaResponse
		}, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			'Accept': '*/*'
		}));
		if(!/1/.test(html))
			throw new AnyBalance.Error("Введенный Вами код неправильный");
		else
			html = AnyBalance.requestPost(baseurl + 'page.php?page=lk-ls-info', {
				ls: prefs.login,
				pwd: prefs.password,
				vpb_captcha_code: captchaResponse,
				saction: 'lspwd'
			}, addHeaders({Referer: baseurl + 'login'}));
	}
	else
		throw new AnyBalance.Error("Картинка с кодом не найдена");

	if (!/exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="login_response"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь с таким логином и паролем не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var balanceDIV = getParam(html, null, null, /баланс(?:[^>]*>){2}([\s\S]*?<\/div>)/i);
	getParam(balanceDIV, result, 'balance', /<div[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /(.+)/, ((/color: #ff0000;/i.test(balanceDIV) ? '-' : '') + '$1')], parseBalance);

	getParam(html, result, 'fio', /абонент:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'adress', /информация(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'people', /Число прописанных(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

	if(isAvailable(['indication', 'consumptions'])) {
		html = AnyBalance.requestGet(baseurl+'page.php?page=lk-hist-counter', g_headers);
		getParam(html, result, 'indication', /История показаний(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'consumption', /История показаний(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}