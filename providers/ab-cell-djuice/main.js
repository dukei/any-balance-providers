/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Djuice
Сайт оператора: http://www.djuice.ua/
Личный кабинет: https://my.djuice.com.ua/
*/
function parseMinutes(str) {
	var val = parseBalance(str);
	if(isset(val)){
		val *= 60; //Переводим в секунды
		AnyBalance.trace('Parsed ' + val + ' minutes from value: ' + str);
	}
	AnyBalance.trace('Parsed ' + val + ' minutes from value: ' + str);
	return val; 
}

function getToken(html) {
    var token = /name="org.apache.struts.taglib.html.TOKEN"[^>]+value="([\s\S]*?)">/i.exec(html);
    if(!token)
        throw new AnyBalance.Error("Не удаётся найти код безопасности для отправки формы. Проблемы или изменения на сайте?");
    return token[1];
}

function main() {
	throw new AnyBalance.Error('Личный кабинет DJUICE закрыт. Все пользователи переведены на Киевстар. Установите провайдер Киевстар.');

	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = 'https://my.djuice.ua/';
	var headers = {
		'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
		'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
		'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
		Connection: 'keep-alive'
	};
	AnyBalance.trace('Соединение с ' + baseurl);

        var html;
	if(prefs.__dbg == 'autologin')
		html = AnyBalance.requestGet(baseurl + 'tbmb/b2c/hierarchy/main/dashboard/show.do');
	else
		html = AnyBalance.requestGet(baseurl + 'tbmb/login_djuice/show.do', headers);

	//заготовка для обработки ошибок сайта, надо будет проверить во время следующего сбоя
	if (/<TITLE>error<\/TITLE>/i.test(html)) {
		var matches = html.match(/(<H1>[\s\S]*?<\/p>)/i);
		if (matches) {
			throw new AnyBalance.Error(matches[1]).replace(/<\/?[^>]+>/g, '');
		}
		throw new AnyBalance.Error("Неизвестная ошибка на сайте.");
	}

	AnyBalance.trace('Успешное соединение.');
	if (/\/tbmb\/logout\/perform/i.test(html)) {
		AnyBalance.trace('Уже в системе.');
		if (html.indexOf(prefs.login) < 0) {
			AnyBalance.trace('Не тот номер, выход.');
			html = AnyBalance.requestGet(baseurl + 'tbmb/logout/perform.do', headers);
			AnyBalance.trace('Переход на страницу входа.');
			html = AnyBalance.requestGet(baseurl + 'tbmb/login_djuice/show.do', headers);
		}else{
			AnyBalance.trace('Залогинены на правильный номер, продолжаем.');
		}
	}

	if (!/\/tbmb\/logout\/perform/i.test(html)) {
		// Login
		var form = getParam(html, null, null, /<form[^>]+action="[^"]*perform.do"[^>]*>([\s\S]*?)<\/form>/i);
		if (form) {
			AnyBalance.trace('Вход в систему.');
			var params = createFormParams(form);
			params.user = prefs.login;
			params.password = prefs.password;
			html = AnyBalance.requestPost(baseurl + "tbmb/login_djuice/perform.do", params, headers);
		}else{
			if (AnyBalance.getLastUrl().indexOf('my.kyivstar.ua') > 0) throw new AnyBalance.Error('Ваш личный кабинет теперь на сайте my.kyivstar.ua. Попробуйте использовать провайдер Киевстар');
			AnyBalance.trace("Searching for login form: " + AnyBalance.getLastUrl() + ': ' + html);
			throw new AnyBalance.Error('Не удалось найти форму для входа в личный кабинет. Сайт изменен?');
		}
        }

	if (!/\/tbmb\/logout\/perform/i.test(html)) {
		var matches = html.match(/<td class="redError"[^>]*>([\s\S]*?)<\/td>/i);
		if (matches) {
			//В случае неверного логина или пароля возвращаем фатальную ошибку. Чтобы не заблокировать аккаунт неправильным вводом пароля
			throw new AnyBalance.Error(matches[1], null, /Логін введений невірно|введіть правильний пароль/i.test(matches[1]));
		}
		AnyBalance.trace("Checking logout: " + AnyBalance.getLastUrl() + ': ' + html);
		throw new AnyBalance.Error("Не удалось зайти в систему. Сайт изменен?");
	}

	if(html.indexOf(prefs.login) < 0){
		AnyBalance.trace("Checking right login: " + AnyBalance.getLastUrl() + ': ' + html);
		throw new AnyBalance.Error("Не удается получить информацию по заданному номеру.");
        }

	AnyBalance.trace('Успешный вход.');
	var result = {
		success: true
	};
	var str_tmp;
	//Тарифный план
	getParam(html, result, '__tariff', /(?:Тарифний план:|Тарифный план:)[\s\S]*?<td\s+[^>]*>(.*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	// Баланс
	getParam(html, result, 'balance', /(?:Залишок на рахунку:|Остаток на счету:)[\s\S]*?<b>(.*?)</i, replaceTagsAndSpaces, parseBalance);
	//Залишок хвилин для дзвінків на Киевстар
	html = sumParam(html, result, 'bonus_mins_kyiv', /(?:Залишок хвилин для дзвінків|Остаток минут для звонков)\s*(?:на Київстар|на Киевстар)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseMinutes, true, aggregate_sum);
	//Залишок хвилин для дзвінків по Украине
	html = sumParam(html, result, 'bonus_mins_country', /(?:Залишок хвилин для дзвінків|Остаток минут для звонков)\s*(?:по Україні|по Украине)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseMinutes, true, aggregate_sum);
	//Остаток минут для звонков на номера абонентов «Киевстар» и по Украине: (относим пока к украине, пока никто не возмущается)
	html = sumParam(html, result, 'bonus_mins_country', /(?:Залишок хвилин для дзвінків|Остаток минут для звонков)[^<]*(?:Киевстар|Київстар)[^<]*(?:Украине|Україні)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseMinutes, true, aggregate_sum);
	//Остаток минут для звонков на номера абонентов DJUICE
	html = sumParam(html, result, 'bonus_mins_dj', /(?:Залишок хвилин для дзвінків|Остаток минут для звонков)[^<]*DJUICE[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseMinutes, true, aggregate_sum);
	//Другие бонусные минуты
	sumParam(html, result, 'bonus_mins', /(?:Залишок хвилин для дзвінків|Остаток минут для звонков)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseMinutes, true, aggregate_sum);
	//Бонусные MMS
	sumParam(html, result, 'bonus_mms', /(?:Бонусні MMS:|Бонусные MMS:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Бонусные SMS
	sumParam(html, result, 'bonus_sms', /(?:Бонусні SMS:|Бонусные SMS:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Бонусные средства
	sumParam(html, result, 'bonus_money', /(?:Бонусні кошти:|Бонусные средства:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Остаток бонусов
	sumParam(html, result, 'bonus_left', /(?:Залишок бонусів:|Остаток бонусов:)[\s\S]*?<b>(.*?)</ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Интернет
	sumParam(html, result, 'internet', /(?:Залишок бонусного об\'єму даних:|Остаток бонусного объема данных:)[\s\S]*?<b>([\s\S]*?)<\/nobr>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Інтернет:|Интернет:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'internet', /(?:Мб для Мобильного Интернета:|Мб для Мобільного Інтернету:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	//Домашний Интернет
	sumParam(html, result, 'home_internet', /(?:Від послуги[^<]*Домашній Інтернет|От услуги[^<]*Домашний Интернет|Бонусні кошти послуги[^<]*Домашній Інтернет|Бонусные средства услуги[^<]*Домашний Интернет)[^<]*:(?:[^>]*>){3}([\s\S]*?)грн/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(html, result, 'home_internet_date', /(?:Від послуги[^<]*Домашній Інтернет|От услуги[^<]*Домашний Интернет|Бонусні кошти послуги[^<]*Домашній Інтернет|Бонусные средства услуги[^<]*Домашний Интернет)[^<]*:(?:[^>]*>){8}\s*<nobr>([^<]*)/i, replaceTagsAndSpaces, parseDate);
	//Срок действия номера
	getParam(html, result, 'till', /(?:Номер діє до:|Номер действует до:)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'phone', /(?:Номер|Номер):[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	//Получим дату последнего пополнения, а также дату последнего пополнения на 40 гривен и больше + 29 дней (для срока действия пакета интернет)
	if(AnyBalance.isAvailable('lastpaydate', 'lastpaysum', 'lastpaydesc', 'paydate40end')){
		html = AnyBalance.requestGet(baseurl + 'tbmb/payment/activity/show.do');
		var allpayments = [];
		var now = new Date();
		var month = new Date(now.getFullYear(), now.getMonth(), 1);
		//Узнаем начальную дату регистрации, чтобы не запрашивать слишком далеко
		var startDate = getParam(html, null, null, /(?:предоставляется, начиная с|зв’язку надається, починаючи з)\s*<b[^>]*>([^<]*)<\/b>/i, replaceTagsAndSpaces, parseDate) || 0;
		getPayments(html, allpayments);
		var maxTries = 3;
		while(!findPayments(allpayments, result) && month.getTime() > startDate && maxTries-- > 0){
			html = AnyBalance.requestPost(baseurl + 'tbmb/view/display_view.do', {
				'org.apache.struts.taglib.html.TOKEN': getToken(html),
				selectedDate: getDateString(new Date(month.getFullYear(), month.getMonth(), 1), '.'),
				fromDate: getDateString(month, '/'),
				toDate: getDateString(new Date(month.getFullYear(), month.getMonth()+1, 0), '/')
			});
			getPayments(html, allpayments);
			startDate = startDate || getParam(html, null, null, /(?:предоставляется, начиная с|зв’язку надається, починаючи з)\s*<b[^>]*>([^<]*)<\/b>/i, replaceTagsAndSpaces, parseDate) || 0;
			month = new Date(month.getFullYear(), month.getMonth()-1, 1);
		}
	}
	AnyBalance.setResult(result);
}

function numSize(num, size){
	var str = num + '';
	if(str.length < size){
		for(var i=str.length; i<size; ++i){
			str = '0' + str;
		}
	}
	return str;
}

function getDateString(dt, separator){
	if(!separator) separator = '.';
		return numSize(dt.getDate(), 2) + separator + numSize(dt.getMonth()+1, 2) + separator + dt.getFullYear();
}

function getPayments(html, allpayments){
	var payments = getParam(html, null, null, /<edx_table[^>]+name="Payments"[^>]*>([\s\S]*?)<\/edx_table>/i);
	if(payments){
        payments.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/ig, function(str, tr){
            var date = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            var desc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            var sum = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            if(!date || !sum){
                AnyBalance.trace('Could not obtain date or sum from row: ' + tr);
            }else{
                allpayments[allpayments.length] = {date: date, desc: desc, sum: sum};
            }
        });
    }
}

function findPayments(allpayments, result){
    var maxIndex = -1, maxIndex40 = -1, maxDate=0, maxDate40=0;
    for(var i=0; i<allpayments.length; ++i){
        var p = allpayments[i];
        if(p.date > maxDate){
            maxDate = p.date;
            maxIndex = i;
        }
        if(p.date > maxDate40 && p.sum >= 40){ //Если заплачено больше 40 гривен
            maxDate40 = p.date;
            maxIndex40 = i;
        }
    }

    var ret = true;
    if(AnyBalance.isAvailable('lastpaydate', 'lastpaysum', 'lastpaydesc')){
        ret = ret && maxIndex >= 0;
        if(maxIndex >= 0){
            result.lastpaydate = allpayments[maxIndex].date;
            result.lastpaysum = allpayments[maxIndex].sum;
            result.lastpaydesc = allpayments[maxIndex].desc;
        }
    }
    if(AnyBalance.isAvailable('paydate40end')){
        ret = ret && maxIndex40 >= 0;
        if(maxIndex40 >= 0){
            var paydate40 = new Date(allpayments[maxIndex40].date);
            var paydate40end = new Date(paydate40.getFullYear(), paydate40.getMonth(), paydate40.getDate() + 29 + 1, 0, -1);
            result.paydate40end = paydate40end.getTime(); //Пакет действует 29 дней после платежа в 40 гривен, но отсчет начинается на следующий день
        }
    }

    return ret;
}
