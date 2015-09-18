/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1024/1024/1024).toFixed(2));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://stats.tis-dialog.ru/";
	
  AnyBalance.setDefaultCharset('windows-1251');
	AnyBalance.setAuthentication(prefs.login, prefs.password);
	
	var html = AnyBalance.requestPost(baseurl + 'index.php?phnumber=' + prefs.login, {
    login: prefs.login,
    passv: prefs.password
  });
	
	var error = getParam(html, null, null, /Ф\.И\.О\.[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	var licschet = getParam(html, null, null, /Лицевой счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	if (!licschet) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(error);
	}
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);

	if (AnyBalance.isAvailable('userName')) {
	  getParam(html, result, 'userName', /Ф\.И\.О\.[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
  }
	
  if (AnyBalance.isAvailable('licschet')) {
  	getParam(html, result, 'licschet', /Лицевой счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
  }
	
  if (AnyBalance.isAvailable('status')) {
	  getParam(html, result, 'status', /Состояние[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
  }
	
  if (AnyBalance.isAvailable('online')) {
  	getParam(html, result, 'online', /Online\ ([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}\ [0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2})\ IP:/i, replaceTagsAndSpaces, html_entity_decode);
  }

	if (AnyBalance.isAvailable('ip')) {
	  getParam(html, result, 'ip', /IP:([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i, replaceTagsAndSpaces, html_entity_decode);
  }

	if (AnyBalance.isAvailable('user_address')) {
  	getParam(html, result, 'user_address', /Адрес подключения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
  }

	if (AnyBalance.isAvailable('speed')) {
	  getParam(html, result, 'speed', /Скорость подключения[\s\S]*?<td[^>]*>([\s\S]*?\/с)/i, replaceTagsAndSpaces, html_entity_decode);
  }

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
