
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://services.beeline.kg/';

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'views/index.xhtml', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var ViewState = AB.getParam(html, null, null, /name="javax.faces.ViewState"[^>]+value="([^"]+)"/i);
	if (!ViewState) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var captchaCode='';
	if (/\/simpleCaptcha\.png/i.test(html)) {
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + 'simpleCaptcha.png', AB.addHeaders({ Referer: baseurl + 'views/index.xhtml' }));
		captchaCode = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
		AnyBalance.trace('Капча получена: ' + captchaCode);
	}

	html = AnyBalance.requestPost(baseurl + 'views/index.xhtml', {
		authInfo2: 'authInfo2',
		'authInfo2:CaptchaID':	captchaCode,
		'authInfo2:but1': '',
		'authInfo2:login': prefs.login,
		'authInfo2:password': prefs.password,
		'authInfo2:passwordVisible': prefs.password,
		'javax.faces.ViewState': ViewState
	}, AB.addHeaders({ Referer: baseurl + 'views/index.xhtml' }));

	var result = { success: true };
	
	AB.getParam(html, result, 'balance', /Ваш баланс[^<]*<[^>]+>\s*([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'bonus', /Накопленные баллы[\D]+([\d\.\s,]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	html = AnyBalance.requestGet(baseurl + 'views/subscrInfo.xhtml', g_headers);
	var text = AB.getParam(html, null, null, null, AB.replaceTagsAndSpaces);

	//AB.getParam(html, result, 'fio', /Фамилия Имя Отчество[^<]*<[^>]+>[^<]*<[^>]+>[^<]*<[^>]+>([^<]*)/i, AB.replaceTagsAndSpaces);
	//AB.getParam(html, result, 'address', /Адрес абонента[^<]*<[^>]+>[^<]*<[^>]+>[^<]*<[^>]+>([^<]*)/i, AB.replaceTagsAndSpaces);
	//AB.getParam(html, result, 'phone2', /Контактный телефон[^<]*<[^>]+>[^<]*<[^>]+>[^<]*<[^>]+>([^<]*)/i, AB.replaceTagsAndSpaces);

	if (/Активный/i.test(text)) result.status = 'активный';
	AB.getParam(text, result, 'fio', /Фамилия Имя Отчество\s+([^<]*)Адрес/i, AB.replaceTagsAndSpaces);
	AB.getParam(text, result, 'address', /Адрес абонента\s+([^<]*)Контактный/i, AB.replaceTagsAndSpaces);
	AB.getParam(text, result, 'phone2', /Контактный телефон\s+(\d+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(text, result, 'dogovor', /Номер договора\s*(\d+)/i);
	AB.getParam(text, result, 'phone', /номер телефона\s+(\d+)/i);
	AB.getParam(text, result, 'sim1', /активации сим карты\s*([\d\.]+\s[\d:]+)/i);
	AB.getParam(text, result, 'sim2', /окончания активного режима\s*([\d\.]+\s[\d:]+)/i);
	AB.getParam(text, result, 'sim3', /окончания режима ожидания\s*([\d\.]+\s[\d:]+)/i);

	AnyBalance.setResult(result);
}
