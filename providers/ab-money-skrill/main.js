/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, sdch',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://account.skrill.com';
	var basegoogle = 'https://www.google.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(prefs.day, 'Введите дату рождения!');

	var date = prefs.day.split(/[^\d]/i);

	var html = AnyBalance.requestGet(baseurl+'/login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var auth_token = getParam(html, null, null, /<input[^>]+name="authenticity_token"[^>]+value="([\s\S]*?)"/i);
	if(!auth_token)
		throw new AnyBalance.Error("Не удалось найти токен авторизации. Сайт изменён?");

	var challange_captcha_token = getParam(
		AnyBalance.requestGet(basegoogle + 'recaptcha/api/challenge?k=6Leojd0SAAAAAKbJlKu_7HtjyBEDEgPxww2p7eNu'),
		null, null,
		/challenge[^']*'([\s\S]*?)'/i);
	if (!challange_captcha_token)
		throw new AnyBalance.Error("Не удалось найти токен капчи. Сайт изменён?");

	var captcha_auth_token = AnyBalance.requestGet(basegoogle+'recaptcha/api/reload?c='+challange_captcha_token+'&k=6Leojd0SAAAAAKbJlKu_7HtjyBEDEgPxww2p7eNu&reason=i&type=image&lang=ru', g_headers);

	var recaptcha_challenge_field = getParam(captcha_auth_token, null, null, /\('([\s\S]*?)'/i) || '';
	if(!recaptcha_challenge_field)
		throw new AnyBalance.Error("Не удалось найти параметр капчи. Сайт изменён?");

	var xhtml = AnyBalance.requestPost(baseurl+'/login', {
		'utf8': '✓',
		'authenticity_token': auth_token,
		'user_authentication[email]': prefs.login,
		'user_authentication[password]': prefs.password,
		'recaptcha_challenge_field': recaptcha_challenge_field,
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl+'/login?locale=ru',
		'Accept': '*/*'
	}));

	var json = getJson(xhtml);
	var DBReq =  json.data ? json.data.date_of_birth_challenge_required : undefined;
	if(DBReq) {

		AnyBalance.trace("Сайт запросил дату рождения.");

		xhtml = AnyBalance.requestPost(baseurl+'/login', {
			'utf8': '✓',
			'authenticity_token': params.authToken,
			'user_authentication[email]': prefs.login,
			'user_authentication[password]': prefs.password,
			'recaptcha_challenge_field': params.recaptcha_challenge_field,
			'user_authentication[date_of_birth(3i)]': date[0],
			'user_authentication[date_of_birth(2i)]': date[1],
			'user_authentication[date_of_birth(1i)]': date[2]
		}, addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));

		json = getJson(xhtml);

		if(!json.success) {
			var error = json.alerts[0] ? json.alerts[0].message : undefined;
			if(error)
				throw new AnyBalance.Error(error, null, /Неправильная дата рождения/i.test(error));
			AnyBalance.trace(xhtml);
			throw new AnyBalance.Error("Не удалось получить ошибку при отправке даты рождения. Сайт изменён?");
		}
	}

	if(!json.redirect) {
		var error = json.alerts[0] ? json.alerts[0].message : undefined; //так получается ошибка при неверном вводе лог/паса
		var err_recaptcha = json.alerts[0] ? json.alerts[0].key : undefined;
		if(err_recaptcha != 'recaptcha.errors.verification_failed') {
			if(error)
				throw new AnyBalance.Error(error, null, /адрес электронной почты или пароль указаны неверно/i.test(json.alerts[0].message));
			AnyBalance.trace(xhtml);
			throw new AnyBalance.Error("Не удалось войти в личный кабинет. Сайт изменён?");
		}
		AnyBalance.trace("Получили ошибку капчи.");
	}


	html = AnyBalance.requestGet(baseurl+'/dashboard', g_headers);

	if(!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Неправильный логин или пароль.", null, true);
	}

	var result = {success: true};

	getParam(html, result, 'id',/<span[^>]+class='user-id'[^>]*>[^\d]*(\d+)\)/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<span[^>]+class="balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /<span[^>]+class="balance"[^>]*>([^\d]*)-?\d[\s\S]*?<\/span>/i, [replaceTagsAndSpaces, /(.?)/i, '0'+'$1'], parseCurrency);
	AnyBalance.setResult(result);
}
