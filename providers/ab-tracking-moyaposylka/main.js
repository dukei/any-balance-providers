/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: '*/*',
	'Accept-Language': 'ru,en;q=0.8',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36'
};

var g_baseurl = 'https://moyaposylka.ru';

function apiCall(verb) {
	html = AnyBalance.requestGet(g_baseurl + '/api/v1/' + verb, AB.addHeaders({
		Accept: 'application/json, text/plain, */*',
		'Content-Type': 'application/json;charset=UTF-8',
		Origin: g_baseurl,
		Referer: g_baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = AB.getJson(html);

	if(json.status && json.status != 200) {
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось получить данные из-за ошибки на сервере, попробуйте обновить данные позже. Код ошибки: ' + json.error + ', ' + json.message);
	}
	return json;
}

function getMyPosylkaResult(prefs) {
	AnyBalance.trace('Connecting to moyaposylka...');
    AB.checkEmpty(prefs.track_id, 'Введите трек-номер отправления!');

	var dest = prefs.track_dest || "RU"; //Страна назначения
	var html = AnyBalance.requestGet(g_baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');

	AnyBalance.setCookie('moyaposylka.ru', 'trackerNumber', prefs.track_id);
	AnyBalance.setCookie('moyaposylka.ru', 'countryCode', dest);

	var json = apiCall('carriers/' + encodeURIComponent(prefs.track_id));
	if(json.length == 0){
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Неизвестный тип почтового отправления, проверьте правильность введенных данных');
	}

	if(dest){
		AnyBalance.requestPost(g_baseurl + '/api/v1/trackers/' + json[0].code + '/' + encodeURIComponent(prefs.track_id) + '/realtime', JSON.stringify({
			countryCode: dest
		}), addHeaders({
			'Content-Type': 'application/json',
			'X-Requested-With': 'XMLHttpRequest',
			'X-Realtime': 'Portal',
		}));
	}

	var info = apiCall('trackers/' + json[0].code + '/' + encodeURIComponent(prefs.track_id)), tr = 0;

	do{
		try{
			json = apiCall('trackers/' + json[0].code + '/' + encodeURIComponent(prefs.track_id) + '/realtime');
			break;
		}catch(e){
			AnyBalance.trace('Попытка ' + (++tr) + ': ' + AnyBalance.getLastStatusCode());
			AnyBalance.sleep(1000);
		}
	}while(tr <= 30);

	if(tr > 30){
		throw new AnyBalance.Error('Не удалось получить информацию об отправлении. Либо оно еще не попало в базу, либо почта не отдает данные. Попробуйте еще раз позже');
	}
		

	if(!json.events && !json.events.length) {
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось получить информацию об отправлении. Либо оно еще не попало в базу, либо почта не отдает данные. Попробуйте еще раз позже');
	}

	var result = {success: true};

	try{
		var ls = json.events[0];

		var lsdate = (ls && ls.eventDate) || 0,
			lsplace = (ls && ls.location) || '',
			lsstatus = (ls && ls.operation) || '???';
			
		var infoattribute = (json && json.attributes && json.attributes.type) || '',
			infooperator = (json && json.carrier && json.carrier.name) || '',
			infoweight = (json && json.weight) || 0,
			infotrackid = (json && json.barcode) || '???';

		if(info.deliveringTime){
			var days = info.deliveringTime;
		}else{
		    var days = ls ? Math.round(((ls.delivered ? ls.eventDate : +new Date()) - json.events[json.events.length-1].eventDate)/86400000) : 0;
		}

        AB.getParam(infotrackid, result, 'trackid');
		AB.getParam(infotrackid, result, '__tariff');
        AB.getParam(days, result, 'days');
        AB.getParam(lsdate, result, 'date');
        AB.getParam(lsplace, result, 'address');
        AB.getParam(lsstatus, result, 'status');
		AB.getParam(infoattribute, result, 'attribute');
		AB.getParam(infooperator, result, 'operator');
		AB.getParam(infoweight, result, 'weight');

		if (AnyBalance.isAvailable('fulltext')) {
			var date = lsdate || +new Date();
			var address = lsplace;
			var status = lsstatus;
			result.fulltext = '<b>' + status + '</b><br/>\n' + getDateString(date) + ': ' + address + '.<br/>\n' + 'В пути ' + days + ' дн.';
		}
		return result;
	}catch(e){
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось получить данные. Возможно на сайте возникли перебои в работе, попробуйте обновить данные позже.');
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	var result = getMyPosylkaResult(prefs);
	AnyBalance.setResult(result);
}

function numSize(num, size) {
	var str = num + '';
	if (str.length < size) {
		for (var i = str.length; i < size; ++i) {
			str = '0' + str;
		}
	}
	return str;
}

function getDateString(dt) {
	if (typeof dt != 'object') dt = new Date(dt);
	return numSize(dt.getDate(), 2) + '.' + numSize(dt.getMonth() + 1, 2) + '.' + dt.getFullYear() + " " + numSize(dt.getHours(), 2) + ':' + numSize(dt.getMinutes(), 2);
}

function createCountries(baseurl, result) {
	var html = AnyBalance.requestGet(baseurl);
	var ids = [],
	names = [];
	html.replace(/<option[^>]+value="([^"]*)[^>]*>([^<]*)<\/option>/ig, function(str, countryid, countryname) {
		ids[ids.length] = countryid;
		names[names.length] = countryname;
		return str;
	});
	result.entries = ids.join('|');
	result.entryValues = names.join('|');
}
