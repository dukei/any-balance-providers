/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления Почты России

Сайт оператора: http://www.russianpost.ru
Личный кабинет: http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo
*/

function main(){
	var prefs = AnyBalance.getPreferences();
        if(!prefs.code) //Код отправления, введенный пользователем
            throw AnyBalance.Error("Введите код отправления!");

        if(prefs.type == 'rp')
            mainRussianPost();
        else if(/^\d+$/.test(prefs.code)){
            AnyBalance.trace('Идентификатор ' + prefs.code + ' похож на идентификатор почты России, а не на EMS. Попытаемся обработать его через russianpost.ru');
            mainRussianPost();
        }else
            mainEms();
}

function mainEms(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Connecting to ems...');

        var info = AnyBalance.requestPost("http://www.emspost.ru/tracking.aspx/TrackOne", JSON.stringify({id: prefs.code.toUpperCase()}), {
            'Content-Type':'application/json; charset=UTF-8',
            Referer: 'http://www.emspost.ru/ru/tracking/?id=' + prefs.code.toUpperCase()
        });

        var json = JSON.parse(info).d;
        if(json.errorMessage)
            throw new AnyBalance.Error(json.errorMessage);

        if(!json.Operations || json.Operations.length == 0)
            throw new AnyBalance.Error("В этом отправлении нет зарегистрированных операций!");

	var result = {success: true};

        var op = json.Operations[json.Operations.length-1];
        var oper = op.opType == 2 ? 'Завершено' : 'В пути';

        if(AnyBalance.isAvailable('date'))
            result.date = op.opDateTime;
	if(AnyBalance.isAvailable('location'))
	    result.location = op.opAddressDescription;
	if(AnyBalance.isAvailable('operation'))
	    result.location = oper;
	if(AnyBalance.isAvailable('attribute'))
	    result.attribute = op.opStatus;

	if(AnyBalance.isAvailable('fulltext')){
	    //Все поддерживаемые атрибуты (кроме img) находятся здесь
	    //http://commonsware.com/blog/Android/2010/05/26/html-tags-supported-by-textview.html
	    result.fulltext = '<small>' + op.opDateTime + '</small>: <b>' + oper + '</b><br/>\n' +
	        op.opAddressDescription + '<br/>\n' + 
	        op.opStatus;
	}

        AnyBalance.setResult(result);
}

function mainRussianPost(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Connecting to russianpost...');
	
	var dt = new Date();
	var info = AnyBalance.requestPost('http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo', {
		PATHCUR:'rp/servise/ru/home/postuslug/trackingpo',
		CDAY:dt.getDate(),
		CMONTH:dt.getMonth()+1,
		CYEAR:dt.getFullYear(),
		PATHWEB:'RP/INDEX/RU/Home',
		PATHPAGE:'RP/INDEX/RU/Home/Search',
		BarCode:prefs.code.toUpperCase(),
		searchsign:1
	});
	
	var result = {success: true},
		matches;
	
	AnyBalance.trace('trying to find table');
        result.__tariff = prefs.code;

        if(matches = /<p[^>]*class="red"[^>]*>([\s\S]*?)<\/p>/i.exec(info)) //Проверяем на сообщение об ошибке
		throw new AnyBalance.Error(matches[1]);  
        if(/<h1>Server is too busy<\/h1>/i.test(info))
		throw new AnyBalance.Error("Сервер russianpost.ru перегружен. Попробуйте позже.");  
	
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