/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления Почты России

Сайт оператора: http://www.russianpost.ru
Личный кабинет: http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo
*/

function main(){
	AnyBalance.trace('Connecting to russianpost...');
	
	var prefs = AnyBalance.getPreferences();
	var post_number = prefs.code; //Код отправления, введенный пользователем
	
	var dt = new Date();
	var info = AnyBalance.requestPost('http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo', {
		PATHCUR:'rp/servise/ru/home/postuslug/trackingpo',
		CDAY:dt.getDate(),
		CMONTH:dt.getMonth()+1,
		CYEAR:dt.getFullYear(),
		PATHWEB:'RP/INDEX/RU/Home',
		PATHPAGE:'RP/INDEX/RU/Home/Search',
		BarCode:post_number,
		searchsign:1
	});
	
	var result = {success: true},
		matches;
	
	AnyBalance.trace('trying to find table');
	
	//Сначала найдём таблицу, содержащую все стадии отправления
	if(matches = info.match(/<table class="pagetext">.*?<tbody>(.*?)<\/tbody>/)){
		AnyBalance.trace('found table');
		var alltable = matches[1];
		//Потом найдем там последнюю строку
		var lasttr = alltable.lastIndexOf('<tr');
		AnyBalance.trace('found last row at ' + lasttr);
		
		info = alltable.substring(lasttr);
		AnyBalance.trace(info);
		
	
		//Потом найдем отдельные поля
		if(matches = info.match(/<tr[^>]*><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/i)){
			AnyBalance.trace('parsed fields');
			var operation, date, location, attribute;
			if(AnyBalance.isAvailable('fulltext','operation'))
				operation = matches[1];
			if(AnyBalance.isAvailable('fulltext','date'))
				date = matches[2];
			if(AnyBalance.isAvailable('index'))
				result.index = matches[3];
			if(AnyBalance.isAvailable('fulltext','location'))
				location = matches[4];
			if(AnyBalance.isAvailable('fulltext','attribute'))
				attribute = matches[5];
			if(AnyBalance.isAvailable('weight'))
				weight = matches[6];
			
			if(AnyBalance.isAvailable('operation'))
				result.operation = operation;
			if(AnyBalance.isAvailable('date'))
				result.date = date;
			if(AnyBalance.isAvailable('date'))
				result.date = date;
			if(AnyBalance.isAvailable('location'))
				result.location = location;
			if(AnyBalance.isAvailable('attribute'))
				result.attribute = attribute;
			
			if(AnyBalance.isAvailable('fulltext')){
				//Все поддерживаемые атрибуты (кроме img) находятся здесь
				//http://commonsware.com/blog/Android/2010/05/26/html-tags-supported-by-textview.html
				result.fulltext = '<small>' + date + '</small>: <b>' + operation + '</b><br/>\n' +
					location + '<br/>\n' + 
					attribute;
			}
			
			AnyBalance.setResult(result);
		}
	}
	
	if(!AnyBalance.isSetResultCalled())
		throw new AnyBalance.Error("Отправление не найдено.")
}
