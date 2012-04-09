/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о карте Рив Гош

Сайт программы: http://www.rivegauche.ru/discount

1.0.1 - Начало.
*/


function main(){
	var prefs = AnyBalance.getPreferences();
	var url='http://www.rivegauche.ru/discount/savings';

	AnyBalance.trace('Sending a request...');

        AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestGet(url);




	AnyBalance.trace('Authorization was successful');
	var result = {success: true};
	AnyBalance.trace('Start parsing...');
	

        var regexp=/form_build_id\" id=\"(.*)\" value/;
	if (res=regexp.exec(html)){
		var form_build_id=res[1];
	}
	regexp=/form_id\" id=\"(.*)\" value/;
	if (res=regexp.exec(html)){
		var form_id=res[1];
	}

	var header = {
		"Accept"	:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Referer"	:"http://www.rivegauche.ru/discount/savings",
		"Origin"	:"http://www.rivegauche.ru"
	};


	var post={
		cardtype:prefs.cardtype,
		cardnum:prefs.cardnum,
		op:'',
		form_build_id:form_build_id,
		form_id:"savings_check_form"
	}
	var html = AnyBalance.requestPost(url,post,header);




	if (prefs.cardtype==0){//Обычная карта
		regexp=/На Вашей карте:\" \/><br \/>\n<div class=\"savingsAmmount\">(.*)<\/div>/m;
		if (res=regexp.exec(html)){
			result.balance=res[1];
		}
		regexp=/последняя операция по карте (.*)<br>/m;
		if (res=regexp.exec(html)){
			result.date=res[1];
		}
	}
	if (prefs.cardtype==1){//Золотая карта
		regexp=/общая сумма накоплений:<\/div>\n<div class=\"savingsAmmount\">(.*)<\/div>/m;
		if (res=regexp.exec(html)){
			result.balance=res[1];
		}
		regexp=/сумма бонуса к Вашему дню рождения:<\/div>\n<div class=\"savingsAmmount\">\n(.*)\n<\/div>/m;
		if (res=regexp.exec(html)){
			result.bonus=res[1];
		}
		regexp=/последняя операция по карте (.*)<br>/m;
		if (res=regexp.exec(html)){
			result.date=res[1];
		}
		regexp=/статус карты (.*)</;
		if (res=regexp.exec(html)){
			result.status=res[1];
		}
	}

	AnyBalance.trace('End parsing...');
	AnyBalance.setResult(result);
}