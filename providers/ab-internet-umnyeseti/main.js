/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://stat.umnyeseti.ru:8080/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html=AnyBalance.requestGet(baseurl+'login',g_headers);

	var form = getElement(html, /<form[^>]+login[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}
	   var params = createFormParams(form, function(params, str, name, value) {
		AnyBalance.trace('Processing form field ' + name + ': ' + value);
		if (/user\[login\]/i.test(name)) 
			return prefs.login;
		else if (/user\[password\]/i.test(name))
			return prefs.password;
		else if (/submit/i.test(name))
			return undefined;
		return value;
	   });
    	var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    	var html=AnyBalance.requestPost(baseurl+action,params,g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (!(/logout/i.test(html)||/<title>Личный кабинет<\/title>/i.test(html))) {
		AnyBalance.trace(html);
		var error =getParam(html,null,null,/class="error_container">([\s\S]*?)<\/div>/,replaceTagsAndSpaces)
		if (error) throw new AnyBalance.Error(error,null,/логин|пароль/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var json=getParam(html,null,null,/HupoApp\((\{[\s\S]*?\})\.data/)
	var json=getJson(json);
	var result = {success: true};

	getParam(json.data.personal_accounts[0].n_sum_bal , result, 'balance', null, null, parseBalance);
	try{
		getParam(json.data.personal_accounts[0].vc_account  , result, 'ls');
		getParam(json.data.person.vc_name  , result, 'fio');
		result.abon=0;
		json.data.servs.forEach(s=>sumParam(s.n_serv_amount_cur, result, 'abon', null, null, parseBalance, aggregate_sum));
		getParam(json.data.servs[0].vc_name  , result, '__tariff');
		getParam(json.data.servs[0].detailed_info.n_speed_volume_cur , result, 'speed', null, null, parseBalance);
		getParam(json.data.servs[0].detailed_info.n_quant_cur , result, 'traf', null, null, parseBalance);
		getParam(json.data.servs[0].d_invoice_begin , result, 'd_invoice_begin', null, null, parseDateISO);
		getParam(json.data.servs[0].d_invoice_end , result, 'd_invoice_end', null, null, parseDateISO);
		var html='';
		json.data.activities.forEach(a=>html+=new Date(parseDateISO(a.d_oper)).toLocaleString()+' '+a.vc_activity_message+'<br><br>')
		getParam(html, result, 'activities');
	}catch(e){
		getParam(e.message, result, 'activities');
	}
	AnyBalance.setResult(result);
}
