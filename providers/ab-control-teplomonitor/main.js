 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Диспетчеризация и удаленный мониторинг систем отопления ТеплоМОНИТОР
Сайт оператора: http://control.teplomonitor.ru
Личный кабинет: http://control.teplomonitor.ru
*/
function main(){
    var prefs = AnyBalance.getPreferences();
 	
	var baseurl = 'http://control.teplomonitor.ru';
    AnyBalance.setDefaultCharset('utf8');    
	
	// Заходим на главную страницу
	var html = AnyBalance.requestPost(baseurl + "", {
		login: prefs.login,
		password: prefs.password
	});
    
    var regexp=/<div class='reminder'.*?><p>([\D]*?)</i,res;
	
	if (res=regexp.exec(html)) throw new AnyBalance.Error(res[1]);
	
    var result = {success: true};

	// Баланс
	getParam (html, result, 'balance', /value_17_2'>([\d\.-]*)</, [/ |\xA0/, "", ",", "."], parseInt);

	// Коллектор
	getParam (html, result, 'collector', /value_17_1000'>([\d\.-]*)</, [/ |\xA0/, "", ",", "."], parseFloat);

	// Температура 2
	getParam (html, result, 'temperature2', /value_17_1001'>([\d\.-]*)</, [/ |\xA0/, "", ",", "."], parseFloat);
	
	// Температура 3
	getParam (html, result, 'temperature3', /value_17_1002'>([\d\.-]*)</, [/ |\xA0/, "", ",", "."], parseFloat);
	
	// Температура 6
	getParam (html, result, 'temperature6', /value_17_1005'>([\d\.-]*)</, [/ |\xA0/, "", ",", "."], parseFloat);
	
    AnyBalance.setResult(result);
}

