/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'en-XA,en;q=0.9,ru-RU;q=0.8,ru;q=0.7,en-US;q=0.6',
	'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': 1
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('Windows-1251');

	var formattedPhone = getParam(prefs.phone || '', null, null, /\d{10}$/, [/^.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '($1) $2-$3-$4']);
	AnyBalance.trace(formattedPhone);

	checkEmpty(formattedPhone, 'Введите номер телефона, используемый для входа в личный кабинет (10 цифр). Вы ввели: "' + (prefs.phone || 'пустое значение') + '"!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var baseurl = 'https://ukplus.ru/disp/';
	var apiurl = 'http://givemetext.okfnlabs.org/tika/tika';

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'phone')
			return formattedPhone;
		else if (name == 'password')
			return prefs.password;

		return value;
    });

    html = AnyBalance.requestPost(baseurl + '?act=login', params, addHeaders({Referer: baseurl}));

	if (/d_err/i.test(html)) {
		var error = getParam(html, /<div[^>]+class="d_err[^>]*>(.*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Введите корректный пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Забыли пароль?');
	}

    html = AnyBalance.requestGet(baseurl + '?type=receipt', addHeaders({'Referer': baseurl + '?act=login'}));

    var pdf = AnyBalance.requestGet(baseurl + 'receipt',
        addHeaders({'Referer': baseurl + '?type=receipt'}),
		{options: {FORCE_CHARSET: 'base64'}});

	AnyBalance.setOptions({forceCharset: 'UTF-8'});

	text = AnyBalance.requestPost(apiurl, pdf,
		{'Content-Type': 'application/pdf'},
		{HTTP_METHOD: 'put', options: {REQUEST_CHARSET: 'base64'}}
	);

	if (!text || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(text);
		throw new AnyBalance.Error('Ошибка при обработке PDF. Возможно, сервис givemetext не доступен.');
	}
	var result = {success: true};

	var regex = /Всего к оплате с учетом задолженности и пени: ([^\n]+)\n+(.+)Начислено за текущий период\n.+для внесения платы за ([^\n]+)\n/imus;

	[ ,balance, accruals, tariff] = regex.exec(text);

	result['__tariff'] = tariff.charAt(0).toUpperCase() + tariff.slice(1);
	result['balance'] = - parseBalance(balance);
	result['accruals'] = parseBalance(accruals);

	regex = /\n\n(\d{10}) ЗА ПЕРИОД (\d{2})\.(\d{4}) ([^\n]+)\n{2}(\d{2}\.\d{4})\n\s+([^\n]+)\n([^\n]+)\n(\S+)\s+(\S+)\s+\n([^\n]+)\n/imus;

	[ ,account, month, year, address, period, fio, address2, full_area, living_area, provider] = regex.exec(text);

	result['account'] = account;
	var period_date = new Date(year + '-' + month + '-01');
	let formatter = new Intl.DateTimeFormat('ru', {month: 'long', year: 'numeric'});
	period = formatter.format(period_date);

	result['period'] = period.charAt(0).toUpperCase() + period.slice(1);;
	result['address'] = address;
	result['fio'] = fio;
	result['full_area'] = full_area;
	result['living_area'] = living_area;
	result['provider'] = provider;

	AnyBalance.setOptions({forceCharset: 'Windows-1251'});
	var replaceDivToBr = [/<\/*[^>]*>/ig, '^', /\s+/ig, ' ', /^\^(.*)\^$/, '$1', /\^\s*\^/, '^', /\^/ig, '<br>'];

	if (AnyBalance.isAvailable('messages')) {
		html = AnyBalance.requestGet(baseurl + '?type=messages', addHeaders({'Referer': baseurl + '?type=receipt'}));
		//AnyBalance.trace(html);
		getParam(html, result, 'messages', /СООБЩЕНИЯ<\/div><div[^>]+>(.*)<div[^>]+><a/ims, replaceDivToBr, html_entity_decode);
	}
	if (AnyBalance.isAvailable('notifications')) {
		html = AnyBalance.requestGet(baseurl + '?type=alert', addHeaders({'Referer': baseurl + '?type=receipt'}));
		//AnyBalance.trace(html);
		getParam(html, result, 'notifications', /УВЕДОМЛЕНИЯ<\/div><div[^>]+>(.*)<div[^>]+><a/ims, replaceDivToBr, html_entity_decode);
	}

	AnyBalance.setResult(result)

}
