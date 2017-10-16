﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://paycard.beeline.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://paycard.beeline.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'personal/pub/Entrance', addHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'}));
	AnyBalance.sleep(1000); //Без таймаутов не пашет

	var form = getParam(html, null, null, /<form[^>]*login[\s\S]*?<\/form>/i);
	checkEmpty(form, 'Не удалось найти форму входа, сайт изменен?', true);
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'ean')
			return prefs.login;
		if (name == 'rememberEan')
			return undefined;
		
		return value;
	});
	
	var action = getParam(form, null, null, /<form[^>]*data-validator-ajax-url="([^"]+)/i, [/\.\.\//, '']);
	checkEmpty(action, 'Не удалось найти ссылку входа, сайт изменен?', true);
	
	html = AnyBalance.requestPost(baseurl + 'personal/' + action, params, addHeaders({
		Referer: baseurl + 'personal/pub/Entrance',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'X-Requested-With':'XMLHttpRequest'
	}));
	AnyBalance.sleep(1000); //Без таймаутов не пашет
	
	params.password = prefs.password;
	
	html = AnyBalance.requestPost(baseurl + 'personal/' + action, params, addHeaders({
		Referer: baseurl + 'personal/pub/Entrance',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',

		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	
	if(!json.validated) {
		var error = '';
		if(json.fields) {
			var errors = json.fields.join(', ');
			for(var i = 0; i < json.fields.length; i++) {
				error += json.fields[i].errorMessage + ', ';
			}
		}
		if(json.form) {
			error = getParam(json.form.errorMessage, null, null, null, replaceTagsAndSpaces);
		}
		
		if (error && error != '')
			throw new AnyBalance.Error(error, null, /несуществующий номер|пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');		
		
	}
	
	var bonuses, tries=0;
	do{
		html = AnyBalance.requestGet(baseurl + 'personal/main', g_headers);
		if(!/b-exit_link/i.test(html)){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет.. Сайт изменен?');
		}

		bonuses = getElement(html, /<table[^>]+b-user-info_bonus[^>]*>/i);
		if(bonuses || ++tries >= 5)
			break;
		AnyBalance.trace('Ожидаем бонусы, попытка ' + tries);
		AnyBalance.sleep(3000); //Бонусы появляются не сразу
	}while(true);

	
	var result = {success: true};
	
	getParam(html, result, 'balance', />Баланс[\s\S]*?<span[^>]*b-user-info_value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /name__user[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', />Номер карты<span[^>]*b-user-info_value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(bonuses, result, 'extra', /Доступные([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);

	if(AnyBalance.isAvailable('last_op_date', 'last_op_sum', 'last_op_descr')){
		var ops = sumParam(html, null, null, /<tbody[^>]+class="[^"]*operation-item[^>]*>([\s\S]*)<\/tbody>/ig);
		if(ops.length > 0){
			getParam(ops[0], result, 'last_op_date', /<td[^>]+class="b-history-detail_date[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^(\d+\D\d+)$/, '$1.'+new Date().getFullYear()], parseDate);
			getParam(ops[0], result, 'last_op_sum', /<td[^>]+class="b-history-detail_sum[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			sumParam(ops[0], result, 'last_op_descr', /<td[^>]+class="b-history_description[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, null, aggregate_join);
			sumParam(ops[0], result, 'last_op_descr', /<td[^>]+class="b-history-detail_comment[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, null, aggregate_join);
		}else{
			AnyBalance.trace('Недавних операций не найдено...');
		}
	}
	
	AnyBalance.setResult(result);
}