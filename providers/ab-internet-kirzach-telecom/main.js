/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Content-Type': 'application/x-www-form-urlencoded'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.kirzhachtelecom.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() >= 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	// Токен авторизации (Rails CSRF-защита)
	var aut_token = AB.getParam(html, null, null, /name="authenticity_token"[^>]*value="([^"]*?)"/i, null, AB.html_entity_decode);
	if(!aut_token)
		throw new AnyBalance.Error('Не удалось найти токен авторизации, сайт либо недоступен, либо изменен');

	html = AnyBalance.requestPost(baseurl + 'login', {
		'utf8': '✓',
		'authenticity_token': aut_token,
		'user[login]': prefs.login,
		'user[password]': prefs.password,
		'commit': 'Войти'
	}, AB.addHeaders({Referer: baseurl + 'login'}));

	// Платформа Hupo: после входа в html страницы встраивается JSON вида new HupoApp({...}, {logLevel: ...})
	var jsonStr = AB.getParam(html, null, null, /new\sHupoApp\(([\s\S]*?),\s*\{logLevel/i);
	var json = jsonStr ? AB.getJsonEval(jsonStr) : null;

	if (!json || !json.data) {
		var error = AB.getParam(html, null, null, /<div[^>]+class=["']error_container["'][^>]*>([\s\S]*?)<\/div/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|заблокирован/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true},
		d = json.data,
		pa = (d.personal_accounts && d.personal_accounts.length) ? d.personal_accounts[0] : null;

	if (!pa)
		AnyBalance.trace('Не найдено информации о лицевом счете.');

	// Услуги (тарифы)
	var servs = d.servs || [],
		suspended = false;
	servs.forEach(function(s){
		if (s.n_good_state_id == 8114) // GOOD_STATE_InsufficientFunds - услуга заблокирована за неуплату
			suspended = true;
	});

	// Баланс — как на сайте (без знака минус)
	AB.getParam(pa && pa.n_sum_bal, result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(d.person && d.person.vc_name, result, 'fio', null, AB.replaceTagsAndSpaces);
	AB.getParam(pa && pa.vc_account, result, 'account', null, AB.replaceTagsAndSpaces);
	// При блокировке за неуплату сайт показывает «Задолженность» (= n_recommended_pay),
	// при отсутствии долга — «Рекомендуемый платеж». Отдельные счётчики, без минуса в балансе.
	var recPay = parseFloat(pa && pa.n_recommended_pay) || 0;
	if (suspended && recPay)
		result.debt = recPay; // «Задолженность»
	else
		AB.getParam(pa && pa.n_recommended_pay, result, 'recommended_pay', null, AB.replaceTagsAndSpaces, AB.parseBalance);
	if (pa && pa.d_accounting_begin)
		AB.getParam(pa.d_accounting_begin, result, 'beg_period', null, AB.replaceTagsAndSpaces, AB.parseDateISO);
	if (pa && pa.d_accounting_end)
		AB.getParam(pa.d_accounting_end, result, 'end_period', null, AB.replaceTagsAndSpaces, AB.parseDateISO);

	if (AnyBalance.isAvailable('last_pay_sum', 'last_pay_date', 'last_pay_type')) {
		AB.getParam(pa && pa.n_last_payment_sum, result, 'last_pay_sum', null, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(pa && pa.d_last_payment, result, 'last_pay_date', null, AB.replaceTagsAndSpaces, AB.parseDateISO);
		// Вид последнего платежа + банк, через который он был проведен (например: «Платежная система / Sberbank»)
		var payType = pa && pa.vc_last_payment_type;
		if (payType && pa && pa.vc_last_payment_bank)
			payType += ' / ' + pa.vc_last_payment_bank;
		AB.getParam(payType, result, 'last_pay_type', null, AB.replaceTagsAndSpaces);
	}

	// Адрес подключения (главный адрес из equipment_addresses)
	var addr = (d.equipment_addresses && d.equipment_addresses.length) ? d.equipment_addresses[0].vc_visual_code : null;
	AB.getParam(addr, result, 'address', null, AB.replaceTagsAndSpaces);

	if (servs.length) {
		var tariffNames = [], monthlyFee = 0;
		servs.forEach(function(s){
			if (s.vc_name)
				tariffNames.push(s.vc_name);
			monthlyFee += parseFloat(s.n_good_sum) || 0;
		});
		if (monthlyFee)
			result.monthly_fee = monthlyFee;
		AB.getParam(tariffNames.join(', '), result, '__tariff', null, AB.replaceTagsAndSpaces);
	} else {
		AnyBalance.trace('Нет подключенных услуг.');
	}

	AnyBalance.setResult(result);
}
