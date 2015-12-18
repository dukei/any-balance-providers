/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://gmch.ru/';

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.houseNumber, 'Введите номер дома!');

	var html = AnyBalance.requestGet(baseurl +'user/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$BodyContener$AccountNumber')
			return prefs.login;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'user/', params, addHeaders({
		Referer: baseurl + 'user/'
	}));

	if (!/подтвердить адрес/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="BodyContener_Messege"[^>]*>([\s\S]*?)<br/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /счета нет в базе данных/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$BodyContener$ApartmentFild$SelectFild')
			return prefs.flatNumber;
		else if(name == 'ctl00$BodyContener$ResultApartment')
			return prefs.flatNumber;
		else if(name == 'ctl00$BodyContener$HouseFild$SelectFild')
			return prefs.houseNumber;
		else if(name == 'ctl00$BodyContener$ResultHouse')
			return prefs.houseNumber;
		else if(name == 'ctl00$BodyContener$ResultHouseCase')
			return prefs.houseCase;
		else if(name == 'ctl00$BodyContener$ResultRoom')
			return prefs.roomNumber;
		else if(name == '__EVENTTARGET')
			return 'ctl00$BodyContener$BtnLogIn';
		return value;
	});

	html = AnyBalance.requestPost(baseurl+'User/', params, addHeaders({
		'Referer': baseurl+'User/',
		Origin: 'http://gmch.ru',
		Host: 'gmch.ru'
	}));
	if (!/сохранить/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="MessageText"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность данных/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<div[^>]+class="saldo"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /<div[^>]+class="saldo"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'device', /прибор учета(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'previousCounter', /предыдущее показание(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'currentCounter', /теку(?:[\s\S]*?<div[^>]*>){6}<input[^>]+value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'consumption', /потребление(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'date', /дата(?:[\s\S]*?<div[^>]*>){6}\d+:\d+([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);

	AnyBalance.setResult(result);
}