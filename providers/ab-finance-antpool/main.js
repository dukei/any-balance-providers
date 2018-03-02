var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.api, 'Введите api_key!');
	checkEmpty(prefs.secret, 'Введите api_secret!');
	checkEmpty(prefs.username, 'Введите username не email!');
	checkEmpty(prefs.indexworker, 'Введите префикс worker!');
	checkEmpty(prefs.coin, 'Введите coin!');
	
	var nonce = new Date().getTime();
	var str = prefs.username + prefs.api + nonce;
	var hash = CryptoJS.HmacSHA256(str,prefs.secret);
	var signature = hash.toString().toUpperCase();
	
	AnyBalance.trace('nonce:' + nonce);
	AnyBalance.trace('api:' + prefs.api);
	AnyBalance.trace('secret_api:' + prefs.secret);
	AnyBalance.trace('username:' + prefs.username);
	AnyBalance.trace('indexworker:' + prefs.indexworker);
	AnyBalance.trace('coin:' + prefs.coin);
	AnyBalance.trace('signature:' + signature);

	var baseurl = 'https://antpool.com/';
	
	var html = AnyBalance.requestPost(baseurl + 'api/workers.htm?key=' + prefs.api + '&nonce=' + nonce + '&signature=' + signature + '&coin=' + prefs.coin, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился.');
	}
	
	var json = getJson(html);
	if (json.message == 'ok'){
		AnyBalance.trace('Авторизация выполнена успешно' );
		var kolvo = json.data.totalRecord;
		if(kolvo < 1)
			throw new AnyBalance.Error("Не удалось найти ни одного Воркера");
		AnyBalance.trace('На монете: '  + prefs.coin + ' найдено: ' + kolvo + ' воркера.' );
		var myworker = prefs.username + '.' + prefs.indexworker;
		
		var record = json.data.rows.find(function(el){
			return el.worker === myworker;
		});
		
		var last10m = record ? record['last10m'] : null;
		var last30m = record ? record['last30m'] : null;
		var last1h = record ? record['last1h'] : null;
		var last1d = record ? record['last1d'] : null;
	}
	else if (json.message == 'Signature error') {
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Проверьте key_api, secret_api и username');
	}
	else{
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Произошла неизвестная ошибка.');
	}

	var result = { success: true };
	getParam(last10m, result, 'last10m', null, null, parseBalance2);
	getParam(last30m, result, 'last30m', null, null, parseBalance2);
	getParam(last1h, result, 'last1h', null, null, parseBalance2);
	getParam(last1d, result, 'last1d', null, null, parseBalance2);
	
	getParam(myworker, result, '__tariff');
    AnyBalance.setResult(result);
}
function parseBalance2(str) {
  var val = parseBalance(str);
  if (isset(val))
    val = Math.round(val * 100) / 100;
  return val;
}