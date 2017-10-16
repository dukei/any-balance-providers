/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.code, 'Введите код отправления!');
	
	mainRussianPost();
}

function mainRussianPost() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Connecting to russianpost...');
	var baseurl = 'https://www.pochta.ru/';
	
	var info = AnyBalance.requestGet(baseurl);
	
	info = AnyBalance.requestPost(baseurl + 'tracking', {
		barcode: prefs.code
	}, addHeaders({
		Referer: baseurl
	}));

	var info = AnyBalance.requestGet(baseurl + 'tracking?p_p_id=trackingPortlet_WAR_portalportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=getList&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_pos=1&p_p_col_count=2&barcodeList=' + prefs.code + '&postmanAllowed=true&_=' + (+new Date()), 
		addHeaders({
			Referer: baseurl + 'tracking',
			'X-Requested-With': 'XMLHttpRequest'
		}));
	
	var result = {success: true};
	
	result.__tariff = prefs.code;
	
	var json = getJson(info);
	
	
	if(!json.list || !json.list[0]){
		var error = json.error && json.error.description;
		if(error)
			throw new AnyBalance.Error(error, null, /barcode/i.test(error));
		AnyBalance.trace(info);
		throw new AnyBalance.Error('Информация о почтовом отправлении не найдена! Проверьте правильность ввода трек-номера: ' + prefs.code);
	}

    var jsonInfo = json.list[0];

	if(!jsonInfo.trackingItem || !jsonInfo.trackingItem.trackingHistoryItemList)
		throw new AnyBalance.Error('Нет информации о прохождении посылки! Возможно, она появится позже.');
	
	var op = jsonInfo.trackingItem.trackingHistoryItemList[0];
	
	getParam(op.date+'', result, ['date', 'fulltext'], null, replaceTagsAndSpaces, parseDateISO);
	getParam(op.humanStatus, result, ['operation', 'fulltext']);
	sumParam(op.cityName, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	sumParam(op.countryName, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	sumParam(op.index, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	getParam(op.description, result, ['attribute', 'fulltext']);
//	getParam(op.Payment+'', result, 'addcost', null, replaceTagsAndSpaces, parseBalance);
	getParam('<small>' + getFormattedDate(null, new Date(result.date)) + '</small>: <b>' + result.operation + '</b><br/>' + result.location + '<br/>' + result.attribute + (result.addcost ? ', Н/п ' + result.addcost + 'р' : ''), result, 'fulltext');
	
	AnyBalance.setResult(result);
}