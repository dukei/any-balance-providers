/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Газпромнефть - Нам по пути.

Сайт программы: http://www.gpnbonus.ru

1.0.2 - Добавил баланс в рублях по курсу программы.
*/


function main(){
	var prefs = AnyBalance.getPreferences();
	var url='http://www.gpnbonus.ru/bonus_authorize/';
	AnyBalance.trace('Sending a request for authorization');
        AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestPost(url, prefs);
	if (!/Персональные данные/.exec(html)){
		AnyBalance.trace(res[1]);
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
   	regexp=/Сумма покупок за текущий месяц.*\n.*\n.*\n.*>(.*) руб.</m;
	if (res=regexp.exec(html)){
		result.month=res[1];
	}

//Сумма для подтверждения статуса
	regexp=/Для подтверждения статуса необходимо совершить покупки на сумму.*\n.*DinPro fs24 .*>(.*) руб.</m;
	if (res=regexp.exec(html)){
		result.month_need=res[1];
	}

//Сумма для повышения статуса
	regexp=/Для повышения статуса необходимо совершить покупки на сумму.*\n.*DinPro fs24 .*>(.*) руб.</m;
	if (res=regexp.exec(html)){
		result.month_need_up=res[1];
	}

//Владелец
   	regexp=/DinPro fs22 .*\">(.*)<\/div>/;
	if (res=regexp.exec(html)){
		result.customer=res[1];
	}

//Текущий статус
	regexp=/.*Текущий статус карты:.*\n.*images.(.*).png/m;
	if (res=regexp.exec(html)){
		result.status=res[1];
		if (result.status == 'silver'){result.status='Серебрянный';}
		if (result.status == 'gold'){result.status='Золотой';}
		result.__tariff=result.status;
	}

//Баланс по курсу в рублях
	if(AnyBalance.isAvailable('balance_money')){
		html=AnyBalance.requestGet("http://www.gpnbonus.ru/on_the_way/");
		regexp=/Наш курс: <b>(\d*) бонусов = (\d*) рубль<\/b>/;
		if (res=regexp.exec(html)){
			result.balance_money=(result.balance*res[2])/res[1];
		}
	}
	AnyBalance.trace('End parsing...');
	AnyBalance.setResult(result);

}