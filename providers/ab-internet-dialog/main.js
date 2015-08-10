/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1024/1024/1024).toFixed(2));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://stats.tis-dialog.ru/";
	
	AnyBalance.setAuthentication(prefs.login, prefs.password);
	
	var html = AnyBalance.requestGet(baseurl + 'atlant/index.php?mod=info');
	
	var error = getParam(html, null, null, /Информация об учётной записи[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	var licschet = getParam(html, null, null, /Лицевой счет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	if (!licschet) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(error);
	}
	
	var result = {success: true};
	
	getParam(html, result, 'userName', /Информация об учётной записи[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /Лицевой счет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Состояние:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /На счёте:[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);
	getParam(html, result, 'turbo', /Остаток турбо-трафика:[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, getTrafficGb);
	getParam(html, result, 'turbo_bougth', /Из них купленного турбо-трафика[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, getTrafficGb);
	
	if (AnyBalance.isAvailable('trafficExt', 'trafficExtIn', 'trafficExtOut')) {
		var t_in = getParam(html, null, null, /Внешний[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, getTrafficGb);
		var t_out = getParam(html, null, null, /Внешний[\s\S]*?<td[^>]*>[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, getTrafficGb);
		if (AnyBalance.isAvailable('trafficExt'))
			result.trafficExt = t_in + t_out;
		if (AnyBalance.isAvailable('trafficExtIn'))
			result.trafficExtIn = t_in;
		if (AnyBalance.isAvailable('trafficExtOut'))
			result.trafficExtOut = t_out;
	}
	
	if (AnyBalance.isAvailable('trafficCity', 'trafficCityIn', 'trafficCityOut')) {
		var t_in = getParam(html, null, null, /Городской[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, getTrafficGb);
		var t_out = getParam(html, null, null, /Городской[\s\S]*?<td[^>]*>[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, getTrafficGb);
		if (AnyBalance.isAvailable('trafficCity'))
			result.trafficCity = t_in + t_out;
		if (AnyBalance.isAvailable('trafficCityIn'))
			result.trafficCityIn = t_in;
		if (AnyBalance.isAvailable('trafficCityOut'))
			result.trafficCityOut = t_out;
	}
	AnyBalance.setResult(result);
}