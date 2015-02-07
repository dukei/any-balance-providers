/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Accept-Encoding': 'gzip, deflate',
	'Connection':'keep-alive',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://hydra.lofisnet.ru:8001/';
    AnyBalance.setDefaultCharset('utf-8'); 
	// у этого провайдера реализована защита.
	var html = AnyBalance.requestGet(baseurl + 'login');
	if(prefs.__dbg){
		html = AnyBalance.requestGet(baseurl);
	} else {
		var token = /authenticity_token[\s\S]*?value="([\s\S]*?)"/i.exec(html);
		// Если токен не нашли, дальше нет смысла идти
		var token = getParam(html, null, null, /authenticity_token[\s\S]*?value="([\s\S]*?)"/i, null, html_entity_decode);
		if(!token)
			throw new AnyBalance.Error('Не удалось найти токен авторизации, сайт либо недоступен, либо изменен');

		html = AnyBalance.requestPost(baseurl + 'login', 
		{
			'authenticity_token': token,
			utf8:'✓',
			commit:'Войти',
			'user[login]':prefs.login,
			'user[password]':prefs.password,
		}, g_headers); 
    }

	var found = /new HupoApp\(([\s\S]*)\.data/i.exec(html);
	var json;
	if(!found){
		found = /class="error_container">([\s\S]*?)<\/div>/i.exec(html);
		if(found)
			throw new AnyBalance.Error('Сайт сообщил об ошибке: '+found[1]);

		throw new AnyBalance.Error('Не удалось получить данные авторизации, возможно сайт не доступен');
	}
	else
		json = getJson(found[1]);

	// Если мы здесь, значит вход удачный
	var result = {success: true};
	var fio = json.data.person.vc_surname + ' ' + json.data.person.vc_first_name + ' ' +json.data.person.vc_second_name;
	getParam(fio, result, 'fio', null, null, null);
	try{
		getParam(json.data.personal_accounts[0].n_sum_bal, result, 'balance', null, null, parseBalance);
		getParam(json.data.personal_accounts[0].vc_name, result, 'account', null, null, null);
		getParam(json.data.personal_accounts[0].d_accounting_begin, result, 'period_begin', null, null, parseDateISO);
		getParam(json.data.widgets.additional_parameters.user.PR_Months.n_value, result, 'months', null, null, parseBalance);
	} catch(e){
		AnyBalance.trace('Что-то пошло не так, возможно, еще нет подключенных услуг в личном кабинете');
	}
    //Иначе не получается нормально получить месячный платеж
	getParam(html, result, 'monthly_fee', /n_good_sum[\s\S]*?n_good_sum":"([\s\S]*?)"/i, null, parseBalance);
	//Возвращаем результат
    AnyBalance.setResult(result);
}
