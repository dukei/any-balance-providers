
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0'
};

function main() {
	var baseurl = 'http://gde.mychameleon.ru/';

	var prefs = AnyBalance.getPreferences();
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	AB.checkEmpty(prefs.watchId, 'Введите ID объекта наблюдения из ссылки http://gde.mychameleon.ru/#watches/<ID>');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 399) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var headers = {
		Referer: baseurl,
		'Cache-Control': 'no-cache',
		Pragma: 'no-cache',
		Accept: 'text/plain, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		'Content-Type': 'application/json; charset=UTF-8'
	};

	// важно что не совсем JSON.stringify({id:1,method:'umService.logout',params:[]}) == {"id":1,"method":"umService.logout","params":[]}
	// а вот так {"id":1,method:"umService.logout",params:[]}
	// и вот так работает {id:1,method:"umService.logout",params:[]}
	var dataPost = '{"id":1,method:"umService.logout",params:[]}';
	var jsonStr = AnyBalance.requestPost(baseurl + 'json-rpc?method=umService.logout&tm=' + (new Date().getTime()), dataPost, AB.addHeaders(headers));


	// ==========================


	// из оригинала
	var TZOffset = 'GMT';
	var tzo = -(new Date()).getTimezoneOffset();
	if (tzo >= 0) {
		TZOffset += '+';
	} else {
		TZOffset += '-';
		tzo = -tzo;
	}
	var tzoh = Math.floor(tzo / 60);
	if (tzoh < 10) {
		TZOffset += '0';
	}
	TZOffset += tzoh + ':';
	var tzom = tzo % 60;
	if (tzom < 10) {
		TZOffset += '0';
	}
	TZOffset += tzom;

	dataPost = '{"id":2,method:"umService.login",params:["' + prefs.login + '","' + prefs.password + '","' + TZOffset + '"]}';
	var jsonStr = AnyBalance.requestPost(baseurl + 'json-rpc?method=umService.login&tm=' + (new Date().getTime()), dataPost, AB.addHeaders(headers));
	var res2 = getJson(jsonStr);
	var sessionTag = res2.result.sessionTag;


	/*
	parameter.number
	params: {
		GPS_STRENGTH: 615,
		GSM_STRENGTH: 614,
		VOLTAGE: 616,
		TEMPERATURE: 613,
		ALTITUDE: 605
	}
	*/
	var params = { 605: 'altitude', 613: 'temperature', 614: 'gsm_strength', 615: 'gps_strength', 616: 'voltage', 617: 'balance' }

	//var result = {success: true, watchName: null, loc: null, voltage: null, balance: null, time: null, gps_strength: null, gsm_strength: null, altitude: null, temperature: null};
	// нет данных для определения баланса
	var result = { success: true };

	var javacriptStr = AnyBalance.requestGet(baseurl + '/ds.p/' + (new Date().getTime()), AB.addHeaders({ Referer: baseurl }));
	var dataJson = [];
	javacriptStr.split('\n').forEach(function (lineStr) {
		var line = lineStr.match(/window\.parent\.[\w]+\(([^\n]+)\);/);
		if (line) {
			var data = getJsonEval(line[1]);
			if (data && data.watchId == prefs.watchId) {
				if (data.loc) {
					result.loc = data.loc;
					if (data.time) result.time = new Date(data.time).toTimeString().substr(0, 8);
				}
				if (data.sensorData && data.sensorData.length) {
					data.sensorData.forEach(function (sensorData) {
						if (sensorData.socketTypeCode == 'SYSTEM' && sensorData.parameters) {
							sensorData.parameters.forEach(function (sensor) {
								var key = params[sensor.number];
								if (key) result[key] = sensor.value;
							});
						}
					});
				}
			}
		}
	});

	// /json-rpc?sessionTag=Q0BT9DkFau&method=tmService.findWatchByOrganizationId&tm=1455727343622
	// {"id":4,method:"tmService.findWatchByOrganizationId",params:[]}

	dataPost = '{"id":4,method:"tmService.findWatchByOrganizationId",params:[]}';
	var jsonStr = AnyBalance.requestPost(baseurl + 'json-rpc?sessionTag=' + sessionTag + '&method=tmService.findWatchByOrganizationId&tm=' + (new Date().getTime()), dataPost, AB.addHeaders(headers));
	var res = getJson(jsonStr);
	if (res && res.result && res.result.list && res.result.list.length) {
		res.result.list.forEach(function (line) {
			if (line.id == prefs.watchId) result.watchName = line.watchName;
		});
	}

	// {"id":5,"result":{"javaClass":"java.util.ArrayList","list":[{"id":10351,"imei":"356306051055656","javaClass":"com.vincot.tm.domain.Terminal","active":true,"typeId":60}]}}
	//var imei = '356306051055656';
	//dataPost = '{"id":5,method:"tmService.findTerminalsByOrganizationId",params:[]}';
	//var jsonStr = AnyBalance.requestPost(baseurl + 'json-rpc?sessionTag='+sessionTag+'&method=tmService.findTerminalsByOrganizationId&tm='+(new Date().getTime()), dataPost, AB.addHeaders(headers)); 
	//var res5 = getJson(jsonStr); 

	//dataPost = '{"id":7,method:"tmService.getAllTerminalTypes",params:[]}';
	//var jsonStr = AnyBalance.requestPost(baseurl + 'json-rpc?sessionTag='+sessionTag+'&method=tmService.getAllTerminalTypes&tm='+(new Date().getTime()), dataPost, AB.addHeaders(headers)); 
	//var res7 = getJson(jsonStr); 

	//dataPost = '{"id":10,method:"cmService.findCommandsByTerminal",params:["'+imei+'"]}';
	//var jsonStr = AnyBalance.requestPost(baseurl + 'json-rpc?sessionTag='+sessionTag+'&method=cmService.findCommandsByTerminal&tm='+(new Date().getTime()), dataPost, AB.addHeaders(headers)); 
	//var res10 = getJson(jsonStr); 

	AnyBalance.setResult(result);
}
