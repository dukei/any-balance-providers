var lk_url = 'https://vorkuta.ru/';

var g_login_errors = {
	error_20: "Неверное имя пользователя или пароль.",
	error_90: "Временная техническая ошибка [1]",
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var result = {success: true, balance: 0};
	checkEmpty(prefs.login, 'Введите логин');
	
	AnyBalance.trace('Пробуем войти в ЛК...');
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = lk_url + 'balance.php?login=' + prefs.login + '&pass=' + prefs.password;
	
	var html = AnyBalance.requestGet(baseurl);
	AnyBalance.trace(html);
	
	var ret_err_code = getParam(html, null, null, /<err_code>([\s\S]*?)<\/err_code>/i, replaceTagsAndSpaces, html_entity_decode);
	if (ret_err_code == 0){
		var ret_balance = getParam(html, result, 'balance', /<balance>([\s\S]*?)<\/balance>/i, replaceTagsAndSpaces, parseBalance);
		var last_pay_summ = getParam(html, result, 'last_pay_sum', /<last_pay_summ>([\s\S]*?)<\/last_pay_summ>/i, replaceTagsAndSpaces, parseBalance);		
		var last_pay_date = getParam(html, result, 'last_pay_date', /<last_pay_date>([\s\S]*?)<\/last_pay_date>/i, replaceTagsAndSpaces, parseDate);
	} else {
		var ret_err_text = getParam(html, null, null, /<err_text>([\s\S]*?)<\/err_text>/i, replaceTagsAndSpaces, html_entity_decode);
		AnyBalance.trace(ret_err_text);
		throw new AnyBalance.Error(ret_err_text);
	}
	
	AnyBalance.setResult(result);
}