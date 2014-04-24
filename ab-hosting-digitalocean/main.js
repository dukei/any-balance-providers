/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о балансе у хостинга Digital Ocean.

Сайт оператора: https://www.digitalocean.com/
Личный кабинет: https://cloud.digitalocean.com/
*/

function main(){
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');

	var baseurl = 'https://cloud.digitalocean.com';

	var html = AnyBalance.requestGet(baseurl + '/login');;	
	html = AnyBalance.requestPost(baseurl + '/sessions', {
		'user[email]': prefs.email,
		'user[password]': prefs.password,
		'user[redirect]': ''
	});

	var status = AnyBalance.getLastStatusCode();

	if( status != 200 && status != 302 ){
		throw new AnyBalance.Error('Ошибка авторизации ');
	}

	html = AnyBalance.requestGet(baseurl + '/billing');

	status = AnyBalance.getLastStatusCode();

	if( status != 200){
		throw new AnyBalance.Error('Ошибка получения данных');
	}
	

	var result = {success: true};

	getParam(html, result, 'balance', /<h3 class='credit'>\s*\$([\d+\.]+)/i, null, parseBalance);
	getParam(html, result, 'usage', /<h3 class='outstanding'>\s*\$([\d+\.]+)/i, null, parseBalance);
	AnyBalance.setResult(result);
}

