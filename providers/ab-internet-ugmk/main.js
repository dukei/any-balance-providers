/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function parseTrafficTotalGb(str) {
	var traffics = str.split(/\//g);
	var total;
	for (var i = 0; i < traffics.length; ++i) {
		var val = parseBalance(traffics[i]);
		if (typeof(val) != 'undefined')
			total = (total || 0) + val;
	}
	total = total && parseFloat((total / 1024).toFixed(2));
	AnyBalance.trace('Parsed total traffic ' + total + ' Gb from ' + str);
	return total;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lk.ugmk-telecom.ru/";

    var html = AnyBalance.requestPost(baseurl + '?login=yes', {
		backurl:'/',
		Login:'Войти',
        USER_LOGIN:prefs.login,
        USER_PASSWORD:prefs.password
    });
	
    if (!/logout=yes/i.test(html)) {
		var error = getParam(html, null, null, /errortext">([^<]+)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var account = getParam(html, null, null, new RegExp('Счёт\\s+№\\s*\\d+' + (prefs.digits || '') + '(?:[^>]*>){35,80}(?:\\s*</div>){3}', 'i'));
	checkEmpty(account, 'Не удалось найти ' + (prefs.digits ? 'счет с последними цифрами ' + prefs.digits : 'ни одного счета!'));
	
    var result = {success: true};
    
	getParam(account, result, 'balance', /На счете:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'fio', /"logout"([^>]*>){7}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, 'account', /Счёт\s*№\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var name = getParam(account, null, null, /usluga-name([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode) || '';
	var tarif = getParam(account, null, null, /Текущий тариф:([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode) || '';
	getParam(name + ' ' + tarif, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}