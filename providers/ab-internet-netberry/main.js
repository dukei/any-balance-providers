/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.trace('Trying to login');
	
	var baseurl = "https://user.nbr.by/bgbilling/webexecuter";

	var html = AnyBalance.requestPost(baseurl, {
		midAuth: 0,
		user: prefs.login,
		pswd: prefs.password
	});

	//AnyBalance.trace(html);
	if (!/\?action=Exit/i.test(html)) {
		var error = getParam(html, null, null, /<h2[^>]*>ОШИБКА:([\s\S]*?)(?:<\/ul>|<\/div>)/, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);

		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
	}

	var result = {success: true};

	if (AnyBalance.isAvailable('balance')) {
		AnyBalance.trace('Getting balance info');
		html = AnyBalance.requestGet(baseurl + '?action=GetBalance&mid=6&module=contract');
		getParam(html, result, 'balance', /Исходящий остаток на конец месяца.*[\s].*?>(.*?)</i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.trace('Getting tariff plane');
	html = AnyBalance.requestGet(baseurl + '?action=ChangeTariff&module=contract');
	getParam(html, result, '__tariff', /<td>Тарифный план[\s\S]*?<td><font>([\S\s]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);

	if (AnyBalance.isAvailable('traffic_time', 'traffic_cost', 'traffic_total', 'traffic_vpn_in', 'traffic_vpn_out', 'traffic_pir_in', 'traffic_pir_out')) {
		AnyBalance.trace('Getting traffic info');
		html = AnyBalance.requestGet(baseurl + '?action=ShowLoginsBalance&mid=6&module=dialup&unit=1048576');

		getParam(html, result, 'traffic_time', /Итого:(?:[\S\s]*?<td[^>]*>){2}[\S\s]*?\[(\d+)\]/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'traffic_cost', /Итого:(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

		var traffic_vpn_in = parseFloat(0.0);
		var traffic_vpn_out = parseFloat(0.0);
		var traffic_pir_in = parseFloat(0.0);
		var traffic_pir_out = parseFloat(0.0);
		
		getParam(html, result, 'traffic_vpn_in', /Итого:(?:[\S\s]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficTotalGb);
		getParam(html, result, 'traffic_vpn_out', /Итого:(?:[\S\s]*?<td[^>]*>){5}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficTotalGb);
		getParam(html, result, 'traffic_pir_in', /Итого:(?:[\S\s]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficTotalGb);
		getParam(html, result, 'traffic_pir_out', /Итого:(?:[\S\s]*?<td[^>]*>){7}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficTotalGb);
		
		if (AnyBalance.isAvailable('traffic_total'))
			result.traffic_total = Math.round((result.traffic_vpn_in + result.traffic_vpn_out + result.traffic_pir_in + result.traffic_pir_out)* 100) / 100;
	}

	AnyBalance.setResult(result);
}

function parseTrafficTotalGb(str) {
	var traffics = str.split(/\//g);
	var total;
	for (var i = 0; i < traffics.length; ++i) {
		var val = parseBalance(traffics[i]);
		if (typeof(val) != 'undefined')
			total = (total || 0) + val;
	}

	total = total && parseFloat((total / 1024)
		.toFixed(2));
	AnyBalance.trace('Parsed total traffic ' + total + ' Gb from ' + str);
	return total;
}