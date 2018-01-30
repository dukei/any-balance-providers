/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept':'text/plain,*/*;q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 

    var baseurl = "http://oao-tts.ru/";

    var hash = hex_md5(getFormattedDate({format: 'DD.MM.YYYY'}) + '.' + prefs.login);
	var html = AnyBalance.requestGet(baseurl + 'services/lnt/infoBalansCard.php?numberCard=' + encodeURIComponent(prefs.login) + '&h=' + hash + '&hi=1&tf=json', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var json = getJson(html);
	if(json.error)
		throw new AnyBalance.Error(json.error, null, /не\s*корректный/i.test(json.error));

    var result = {success: true};

    AB.getParam(json.balance + '', result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(json.tknumber + '', result, '__tariff', null, AB.replaceTagsAndSpaces);
    AB.getParam(json.ostlgottips + '', result, 'lgotleft', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(json.lgottips + '', result, 'lgotnum', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(json.date + '', result, 'lgotlast', null, AB.replaceTagsAndSpaces, AB.parseDate);

    AnyBalance.setResult(result);
}
