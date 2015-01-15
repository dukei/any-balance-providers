/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept: 'application/json, text/javascript, */*; q=0.01',
    Origin: 'http://www.sbyt.irkutskenergo.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.sbyt.irkutskenergo.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер лицевого счета/договора!');
	checkEmpty(prefs.password, 'Введите фамилию!');
	
	var html = AnyBalance.requestGet(baseurl + 'qa/PersonalCabin.html', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

    var plainParams = {
        No:prefs.login,
        FirstName:prefs.password,
        FullName: "",
        PostAddress:"",
        IsApproved:false,
        Residents:"",
        FullArea:"",
        Balanses:[]
    }
    
    var par = 'EnergoSales@LoginPL(\''+ JSON.stringify(plainParams) +'\'#string)';
    
	html = AnyBalance.requestPost(baseurl + 'asp/srvproxy.aspx', {
        Parameters: par
    }, addHeaders({Referer: baseurl + 'qa/PersonalCabin.html', 'X-Requested-With': 'XMLHttpRequest'}));
	
    var json = getJson(html);
    
	if (json.LoginError) {
		var error = getParam(html, null, null, json.LoginError, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(json.Credentials.Balanses, result, 'balance', /Электроэнергия\s\(\d+\)","Balans":"([^]*?)"/i, null, parseBalance);
	getParam(json.Credentials.Balanses, result, 'odn', /(?:Электроэнергия\sОДН\s*?\(\d+\)","Balans":")([^]*?)"/i, null, parseBalance);
	
	AnyBalance.setResult(result);
}