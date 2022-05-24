/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {

	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'

};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://evropochta.by';
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.track, 'Введите Номер посылки!');
	var total=' ';
	AnyBalance.trace(prefs.track);
	var html = AnyBalance.requestGet(baseurl+'/api/track.json/?number='+prefs.track,g_headers);
	AnyBalance.trace(html);
	if(!html || AnyBalance.getLastStatusCode() > 400)
	throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить позже.');
	var res_data = getJson(html);
	
	var total;
	AnyBalance.trace(res_data.data[0].Timex);
	for (var i = 0; i < res_data.data.length; i++) {
	
		res = res_data.data[i];
;		total= total+res.Timex+" - "+ res.InfoTrack+";  ";
		
	}

	var result = {
		success: true
	};
	getParam(total, result, 'place');
	getParam(prefs.track, result, 'track');
	AnyBalance.setResult(result);
	
}