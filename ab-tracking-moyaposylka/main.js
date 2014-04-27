/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления с сайта moyaposylka.ru

Сайт оператора: http://moyaposylka.ru
Личный кабинет: http://moyaposylka.ru
*/
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
	return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth() + 1, 2) + '/' + dt.getFullYear() + " " + numSize(dt.getHours(), 2) + ':' + numSize(dt.getMinutes(), 2);
}

var g_headers = {
	Accept: '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
};

function getMyPosylkaResult(prefs) {
	AnyBalance.trace('Connecting to moyaposylka...');
	checkEmpty(prefs.track_id, 'Введите код почтового отправления');
	//checkEmpty(prefs.track_dest, 'Выберите страну назначения');

	var id = prefs.track_id; //Код отправления, введенный пользователем
	var dest = prefs.track_dest || "RU"; //Страна назначения
	var baseurl = "https://moyaposylka.ru";
	var html = AnyBalance.requestGet(baseurl, g_headers);
        html = AnyBalance.requestPost(baseurl + '/apps/tracker/v1', JSON.stringify({
		method:"getTrackerTypesByNumber",params:{number:prefs.track_id}
        }), addHeaders({
		Accept: 'application/json, text/plain, */*',
		'Content-Type':'application/json;charset=UTF-8',
		Origin: baseurl,
		Referer: baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	var res = getJson(html);
	if(!res.success || res.result.types.length == 0)
		throw new AnyBalance.Error(res.error || 'Неизвестный или неверный тип отправления', null, true);

	html = AnyBalance.requestPost(baseurl + '/apps/tracker/v1', JSON.stringify(
		{method:"getActiveStatuses",params:{
			type:res.result.types[0].type,
			number:prefs.track_id,
			countryCode:dest}}
	), addHeaders({
		Accept: 'application/json, text/plain, */*',
		'Content-Type':'application/json;charset=UTF-8',
		Origin: baseurl,
		Referer: baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	res = getJson(html);
	if(!res.success || res.result.error){
		throw new AnyBalance.Error(res.error || res.result.error || 'Не удаётся получить информацию по отправлению', null);
        }

	var result = {success: true};

        var tracker = res.result.tracker;
	var ls = tracker.lastStatus;
	
	var lsdate = (ls && ls.date) || '',
		lsplace = (ls && ls.place) || '',
		lsstatus = (ls && ls.operationReadable) || '???';
	
	getParam(tracker.number, result, 'trackid');
	getParam(tracker.trackTime + '', result, 'days', null, null, parseBalance);
	getParam(tracker.weight + '', result, 'weight', null, null, parseBalance);
	getParam(lsdate, result, 'date', null, null, parseDate);
	getParam(lsplace, result, 'address');
	getParam(lsstatus, result, 'status');
	
	if (AnyBalance.isAvailable('fulltext')) {
		var date = getParam(lsdate, null, null, null, null, parseDate) || (new Date().getTime());
		var address = lsplace;
		var status = lsstatus;
		var days = tracker.trackTime;
		result.fulltext = '<b>' + status + '</b><br/>\n' + '<small>' + getDateString(date) + '</small>: ' + address + '<br/>\n' + 'в пути ' + days + ' дн.';
	}
	return result;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var result = getMyPosylkaResult(prefs);
	AnyBalance.setResult(result);
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