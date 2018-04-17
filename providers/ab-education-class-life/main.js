	/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:56.0) Gecko/20100101 Firefox/56.0',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.avsu.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'loginparent/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var form = getElement(html, /<form[^>]+id="loginForm"[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'avsu_nick')
			return prefs.login;
		else if (name == 'avsu_pass')
			return prefs.password;
		
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'client/', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
	
	if (!/exitForm/i.test(html)) {
		if(/loginparent/i.test(AnyBalance.getLastUrl()))
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Неверный логин или пароль?');
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var infos = getElements(html, [/<div[^>]+class='dataHeaderLc'[^>]*>/ig, /dataHeaderLcDiv1/i]), info;
	AnyBalance.trace('Найдено ' + infos.length + ' блоков лицевых счетов' );
	for(var i=0; i<infos.length; ++i){
	    info = infos[i];
		var namels = sumParam(info, null, null, /<div[^>]+dataHeaderLcDiv[12][^>]*>([^]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if(!prefs.num)
			break;
		if(namels.indexOf(prefs.num) >= 0)
			break;
	}

	if(!info){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти блок информации о лицевом счете ' + prefs.num : 'Не удалось найти блок информации о лицевом счете. Сайт изменен?');
	}

	var result = {success: true};
	
	sumParam(info, result, '__tariff', /<div[^>]+class='dataHeaderLcDiv1'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(info, result, '__tariff', /<div[^>]+class='dataHeaderLcDiv2'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	getParam(info, result, 'fio', /<div[^>]+class='dataHeaderLcDiv1'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'licschet', /<div[^>]+class='dataHeaderLcDiv2'[^>]*>([\s\S]*?)<\/div>/i, [/Л\/с:/i, '', replaceTagsAndSpaces], html_entity_decode);
	
	getParam(info, result, ['balance_hot', 'balance'], /Горячее питание[\s\S]*?<div[^>]+class='dataHeaderLcDiv4'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, ['balance_cafe', 'balance'], /Буфетное питание[\s\S]*?<div[^>]+class='dataHeaderLcDiv4'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	if(isset(result.balance_hot) && isset(result.balance_cafe))
		getParam(result.balance_hot + result.balance_cafe, result, 'balance');
	
	AnyBalance.setResult(result);
}