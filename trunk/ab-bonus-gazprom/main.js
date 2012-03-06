/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Газпромнефть - Нам по пути.

Сайт программы: http://www.gpnbonus.ru

1.0.4 - Косметические доработки. Добавил курс бонусной программы. Изменил пароль на фамилию.
1.0.3 - Изменения на сайте gpnbonus. Для экономии трафика теперь у них есть мобильная версия, с неё в основно и берется вся информация.
1.0.2 - Добавил баланс в рублях по курсу программы.
*/


function main(){
	var prefs = AnyBalance.getPreferences();
	var url='http://m.gpnbonus.ru/profile/login/';
	AnyBalance.trace('Sending a request for authorization');
        AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestPost(url, prefs);
	if (!/Персональные данные/.exec(html)){
		AnyBalance.trace('Что-то не то, возможно проблемы с сайтом');
		throw new AnyBalance.Error ('Authorization error.');
	};
	AnyBalance.trace('Authorization was successful');
	var result = {success: true};
	AnyBalance.trace('Start parsing...');

//Баланс
	regexp=/Бонусов доступно.*\n.*>(.*)</m;
	if (res=regexp.exec(html)){
		result.balance=res[1];
	}
//Сумма покупок за месяц
   	regexp=/за текущий месяц.*\n.*>(.*) руб.</m;
	if (res=regexp.exec(html)){
		result.month=res[1];
	}
//Сумма для подтверждения статуса
	regexp=/Для подтверждения статуса необходимо совершить покупки на сумму.*\n.*>(.*) руб.</m;
	if (res=regexp.exec(html)){
		result.month_need=res[1];
	}
//Владелец
   	regexp=/.*href=\"\/profile\/main\/\">\n(.*)</m;
	if (res=regexp.exec(html)){
		result.customer=res[1];
		res=/\t(\S+).*?(\S+)\t/.exec(result.customer);
		result.customer=res[1]+' '+res[2];
	}
//Текущий статус
	regexp=/.*Текущий статус карты.*\n.*>(.*?)</m;
	if (res=regexp.exec(html)){
		result.status=res[1];
		result.__tariff=result.status;
	}
//Сумма для повышения статуса
	if(AnyBalance.isAvailable('month_need_up')){
		var url='http://www.gpnbonus.ru/profile/main/';
		var html = AnyBalance.requestGet(url, prefs);
		regexp=/Для повышения статуса необходимо совершить покупки на сумму.*\n.*DinPro fs24 .*>(.*) руб.</m;
		if (res=regexp.exec(html)){
			result.month_need_up=res[1];
		}
	}
//Баланс по курсу в рублях
	if(AnyBalance.isAvailable('balance_money')){
		html=AnyBalance.requestGet("http://www.gpnbonus.ru/on_the_way/");
		regexp=/Наш курс: <b>(\d*) бонусов = (\d*) рубль<\/b>/;
		if (res=regexp.exec(html)){
			result.balance_money=(result.balance*res[2])/res[1];
		}
		regexp=/Наш курс: <b>(\d* бонусов = \d* рубль)<\/b>/;
		if (res=regexp.exec(html)){
			result.kurs=res[1];
		}
	}
	AnyBalance.trace('End parsing...');
	AnyBalance.setResult(result);
}