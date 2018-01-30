var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
};
function getStatus(statusid){
	statusid = {
        'connected':false,
        'connected':true 
    }[statusid] || statusid;
	return {
		false: 'Не Активен',
		true: 'Активен',
	}[statusid] || 'Неизвестный статус (' + statusid + ')';
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.api, 'Введите api!');
	checkEmpty(prefs.worker, 'Введите username.worker!');


		var baseurl = 'https://www.litecoinpool.org/';
		
		var html = AnyBalance.requestGet(baseurl + 'api?api_key=' + prefs.api, g_headers);
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился или вы ввели неверный api key.');
		}
		
	var json = getJson(html);
	if(json.workers[prefs.worker] ===undefined) {
		AnyBalance.trace(json);
			throw new AnyBalance.Error('Ошибка username.worker! Возможно вы ошиблись при вводе.');
	}
	AnyBalance.trace(JSON.stringify(json));

	var result = { success: true };
	getParam(json.workers[prefs.worker].hash_rate, result, 'hashrate');
    getParam(json.workers[prefs.worker].connected, result, 'status', null, null, getStatus);
	 getParam(prefs.worker, result, '__tariff');
    AnyBalance.setResult(result);
}