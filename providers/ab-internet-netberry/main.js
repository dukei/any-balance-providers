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

	if (AnyBalance.isAvailable('__tariff')) {
		AnyBalance.trace('Getting tariff plane');
		html = AnyBalance.requestGet(baseurl + '?action=ChangeTariff&module=contract');
		getParam(html, result, '__tariff', /<td>Тарифный план[\s\S]*?<td><font>([\S\s]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
	}

	AnyBalance.trace('Getting inetServId');
	html = AnyBalance.requestGet(baseurl + '?action=TrafficReport&mid=17&module=inet');
  var inetServId = getParam(html, null, null, /name=\"inetServId\"[^>]*><option value=\"(\d+)\">/i);

	if (AnyBalance.isAvailable('traffic_total')) {
		AnyBalance.trace('Getting traffic_total info');
		html = AnyBalance.requestGet(baseurl + '?action=TrafficReport&mid=17&module=inet&trafficTypeIds=1&trafficTypeIds=2&trafficTypeIds=3&trafficTypeIds=4&unit=1048576&inetServId=' + inetServId);
		getParam(html, result, 'traffic_total', /Итого:([\S\s]*?)&nbsp;МБ/i, replaceTagsAndSpaces, parseTrafficTotalGb);
	}

	if (AnyBalance.isAvailable('traffic_time', 'traffic_cost')) {

		AnyBalance.trace('Getting traffic time cost');
		html = AnyBalance.requestGet(baseurl + '?action=SessionReport&mid=17&module=inet&unit=1048576&inetServId=' + inetServId);

		getParam(html, result, 'traffic_time', /Итого(?:[\S\s]*?<td[^>]*>){1}[\S\s]*?\[(\d+)\]/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'traffic_cost', /Итого(?:[\S\s]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	}

	if (AnyBalance.isAvailable('traffic_vpn_in', 'traffic_vpn_out', 'traffic_pir_in', 'traffic_pir_out')) {

		AnyBalance.trace('Getting traffic info');
		
		html = AnyBalance.requestGet(baseurl + '?action=TrafficReport&mid=17&module=inet&trafficTypeIds=1&unit=1048576&inetServId=' + inetServId);
		getParam(html, result, 'traffic_vpn_in', /Итого:([\S\s]*?)&nbsp;МБ/i, replaceTagsAndSpaces, parseTrafficTotalGb);

		html = AnyBalance.requestGet(baseurl + '?action=TrafficReport&mid=17&module=inet&trafficTypeIds=2&unit=1048576&inetServId=' + inetServId);
		getParam(html, result, 'traffic_vpn_out', /Итого:([\S\s]*?)&nbsp;МБ/i, replaceTagsAndSpaces, parseTrafficTotalGb);

		html = AnyBalance.requestGet(baseurl + '?action=TrafficReport&mid=17&module=inet&trafficTypeIds=3&unit=1048576&inetServId=' + inetServId);
		getParam(html, result, 'traffic_pir_in', /Итого:([\S\s]*?)&nbsp;МБ/i, replaceTagsAndSpaces, parseTrafficTotalGb);

		html = AnyBalance.requestGet(baseurl + '?action=TrafficReport&mid=17&module=inet&trafficTypeIds=4&unit=1048576&inetServId=' + inetServId);
		getParam(html, result, 'traffic_pir_out', /Итого:([\S\s]*?)&nbsp;МБ/i, replaceTagsAndSpaces, parseTrafficTotalGb);
		
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