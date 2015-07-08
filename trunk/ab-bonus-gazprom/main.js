/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Газпромнефть - Нам по пути.

Сайт программы: http://www.gpnbonus.ru
*/

function img2status(str){
    var statuses = {
        silver: 'Серебряный',
        gold: 'Золотой',
        platinum: 'Платиновый'
    };

    return statuses[str] || str;
}

function num2(n){
	return n < 10 ? '0' + n : '' + n;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl='https://www.gpnbonus.ru/';
	AnyBalance.trace('Sending a request for authorization');
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'login/');
	
	var form = getParam(html, null, null, /<form[^>]+id="login_form"[^>]*>([\s\S]*?)<\/form>/i);
	if(!form)
		throw new AnyBalance.Error('Не найдена форма входа. Сайт изменен?');
	
	var params = createFormParams(form);
	
	if(params.captcha_code){
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl + 'bitrix/tools/captcha.php?captcha_code=' + params.captcha_code);
			params.captcha_word = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + params.captcha_word);
		}else{
			throw new AnyBalance.Error('К сожалению, сайт http://www.gpnbonus.ru ввел капчу (ввод циферок с картинки) для входа в личный кабинет. Пожалуйста, обратитесь в справочную службу ГазПромНефть по телефону 8 800 700 5151 и попросите отменить капчу или сделать интерфейс для автоматических программ.');
        }
	}
	AnyBalance.trace('Отправляем данные: ' + JSON.stringify(params));
	params.login = prefs.login;
	params.password = prefs.password;
	
	var html = AnyBalance.requestPost(baseurl + 'profile/login/', params);
	AnyBalance.trace('После логина мы оказались на ' + AnyBalance.getLastUrl());
	if(/newpass/i.test(AnyBalance.getLastUrl())){
		throw new AnyBalance.Error('Газпромбонус просит сменить пароль. Пожалуйста, зайдите в личный кабинет через браузер и смените пароль.');
	}
	if(/pass=false/i.test(AnyBalance.getLastUrl())){
		throw new AnyBalance.Error('Неверный пароль. Пожалуйста, убедитесь, что вы правильно ввели пароль, и попробуйте ещё раз.');
	}
	if (!/Персональные данные/.exec(html)){
		var error = getParam(html.replace(/<!--[\s\S]*?-->/ig, ''), null, null, /<ul[^>]+class="form-errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		AnyBalance.trace('Что-то не то, возможно проблемы с сайтом');
		throw new AnyBalance.Error ('Не удаётся зайти в личный кабинет. Возможно, неправильный логин, пароль или сайт изменен.');
	};
	AnyBalance.trace('Authorization was successful');
	AnyBalance.trace('Start parsing...');
	
	var result = {success: true};
	var balance = getParam(html, null, null, /Бонусов доступно[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(balance, result, 'balance');

	//getParam(html, result, 'balance', /Бонусов доступно[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Текущий статус карты[\s\S]*?<img[^>]+src="[^"]*images\/([^\/"]*)\.png"[^>]*>/i, replaceTagsAndSpaces, img2status);
	getParam(html, result, '__tariff', /Текущий статус карты[\s\S]*?<img[^>]+src="[^"]*images\/([^\/"]*)\.png"[^>]*>/i, replaceTagsAndSpaces, img2status);
	getParam(html, result, 'month_need', /Для подтверждения статуса (?:[\s\S](?!<\/p>))*необходимо совершить покупки на сумму[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	var dt = new Date();
	var curMonth = num2(dt.getMonth() + 1) + '.' + dt.getFullYear();

	getParam(html, result, 'customer', /<div[^>]+class="[^"]*PersonalName"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'month_need_up', /Для повышения статуса (?:[\s\S](?!<\/p>))*необходимо совершить покупки на сумму[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	if(AnyBalance.isAvailable('month2', 'month')){
		html = AnyBalance.requestGet(baseurl + 'profile-online/statistics/');
		sumParam(html, result, 'month2', new RegExp('<tr[^>]*>\\s*<td[^>]*>\\d+\\.' + curMonth + '(?:(?:[\\s\\S](?!</tr>))*?<td[^>]*>){3}([\\s\\S]*?)</td>', 'ig'), replaceTagsAndSpaces, parseBalance, aggregate_sum);
	}

	if(AnyBalance.isAvailable('month1', 'month')){
		html = AnyBalance.requestGet(baseurl + 'profile-online/statistics/index-online.php');
		sumParam(html, result, 'month1', new RegExp('<tr[^>]*>\\s*<td[^>]*>\\d+\\.' + curMonth + '(?:(?:[\\s\\S](?!</tr>))*?<td[^>]*>){3}([\\s\\S]*?)</td>', 'ig'), replaceTagsAndSpaces, parseBalance, aggregate_sum);
	}
	
	if(AnyBalance.isAvailable('month')){
		getParam((result.month1 || 0) + (result.month2 || 0), result, 'month');
	}
	
	//Баланс по курсу в рублях
    /* Курс теперь 1:1, так что неинтересно смотреть.	
	if(AnyBalance.isAvailable('balance_money', 'kurs')) {
		html=AnyBalance.requestGet("https://www.gpnbonus.ru/on_the_way/");
		var regexp = /Наш курс:\D*(\d+)\s*бонус[^=]*=\s*(\d+)\s*руб/;
		if (res = regexp.exec(html)) {
			result.balance_money = Math.floor(((result.balance*res[2])/res[1])*100)/100;
		}
		getParam(html, result, 'kurs', /Наш курс:\s*<b>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	} */
	AnyBalance.trace('End parsing...');
	AnyBalance.setResult(result);
}