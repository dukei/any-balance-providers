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
        Home:true,
        No:prefs.login,
        FIO:prefs.password,
        Rooms_Count:"",
        PostAddress:"",
        IsApproved:false,
        Residents:"",
        FullArea:"",
        FullArea_All:"",
        Balanses:[],
        IsMonthButton:false,
        IsYearButton:false,
        CreditList:[]
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
	
	getParam(json.Credentials.balanses[0].Balans, result, 'balance', null, null, parseBalance);
    
    var today = new Date();
    to_date = today.getDate() + '.' + today.getMonth()+1 + '.' + today.getFullYear();
    from_date = today.getMonth()+1 + '.' + today.getFullYear();
    AnyBalance.trace(from_date);
    AnyBalance.trace(to_date);
    
    var date_par = "EnergoSales@GetPLCreditsMonthSummary('00000000-0000-0000-0000-000000000000'#guid,'01." + from_date + "'#string,'" + to_date + "'#string'true'#bool)";
    
	html = AnyBalance.requestPost(baseurl + 'asp/srvproxy.aspx', {
        Parameters: date_par
    }, addHeaders({Referer: baseurl + 'qa/PersonalCabin.html', 'X-Requested-With': 'XMLHttpRequest'}));  
    
    var json = getJson(html);
    
    getParam(json.Credits[0].Balance, result, 'to_pay', null, null, parseBalance);
    getParam(json.Credits[0].Month, result, 'month', null, null, null);
    getParam(json.Credits[0].Year, result, 'year', null, null, null);
    getParam(json.Credits[0].Pay, result, 'credited', null, null, parseBalance);
    getParam(json.Credits[0].Purchase, result, 'paid', null, null, parseBalance);
	
	AnyBalance.setResult(result);
}