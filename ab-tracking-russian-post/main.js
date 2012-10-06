/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления Почты России

Сайт оператора: http://www.russianpost.ru
Личный кабинет: http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo
*/

function main(){
	var prefs = AnyBalance.getPreferences();
        if(!prefs.code) //Код отправления, введенный пользователем
            throw new AnyBalance.Error("Введите код отправления!");

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

        var addcost = json.AddPaymentText && parseBalance(json.AddPaymentText);
	if(AnyBalance.isAvailable('addcost'))
	    result.addcost = addcost;

	if(AnyBalance.isAvailable('fulltext')){
	    //Все поддерживаемые атрибуты (кроме img) находятся здесь
	    //http://commonsware.com/blog/Android/2010/05/26/html-tags-supported-by-textview.html
	    result.fulltext = '<small>' + op.opDateTime + '</small>: <b>' + oper + '</b><br/>\n' +
	        op.opAddressDescription + '<br/>\n' + 
	        op.opStatus + (addcost ? ', Н/п ' + json.AddPaymentText : '');
	}

        AnyBalance.setResult(result);
}

function checkForErrors(info){
        var matches;
        if(matches = /<p[^>]*class="red"[^>]*>([\s\S]*?)<\/p>/i.exec(info)) //Проверяем на сообщение об ошибке
		throw new AnyBalance.Error(matches[1]);  
        if(/<h1>Server is too busy<\/h1>/i.test(info))
		throw new AnyBalance.Error("Сервер russianpost.ru перегружен. Попробуйте позже.");
}

function checkForRedirect(info, baseurl){
	//<html><head></head><body onload="document.myform.submit();"><form method="post" name="myform" style="visibility:hidden;"><input id="key" name="key" value="288041"/><input type="submit"/></form></body></html> 
        var form = getParam(info, null, null, /<form[^>]+name="myform"[^>]*>([\s\S]*?)<\/form>/i);
        if(form){ //Зачем-то редирект. Что придумали, зачем?...
            AnyBalance.trace('Вернули форму редиректа...');
            var params = createFormParams(form);
            info = AnyBalance.requestPost(baseurl, params);
            checkForErrors(info);
        }
        if(/window.location.replace\(window.location.toString/.test(info)){
            AnyBalance.trace('Ещё разок редиректнули...');
            info = AnyBalance.requestGet(baseurl);
            checkForErrors(info);
        }
        return info;
}

function mainRussianPost(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Connecting to russianpost...');
        var baseurl = 'http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo';
	
	var info = AnyBalance.requestGet(baseurl);
        info = checkForRedirect(info, baseurl);

        var form = getParam(info, null, null, /<form[^>]+name="F1"[^>]*>([\s\S]*?)<\/form>/i);
        if(!form){
            checkForErrors(info);
            throw new AnyBalance.error('Не удалось найти форму запроса. На сайте обед?');
        }

        var params = createFormParams(info, function(params, input, name, value){
            var undef;
            if(name == 'BarCode')
                value = prefs.code.toUpperCase();
            else if(name == 'searchsign')
                value = 1;
            else if(name == 'searchbarcode')
                value = undef;
            return value;
        });
    
        
	var dt = new Date();
	var info = AnyBalance.requestPost(baseurl, params);
	
	AnyBalance.trace('Проверяем, нет ли ошибок...');

        checkForErrors(info);
        info = checkForRedirect(info, baseurl);
	
	var result = {success: true},
		matches;
	
        result.__tariff = prefs.code;

	AnyBalance.trace('trying to find table');
	//Сначала найдём таблицу, содержащую все стадии отправления
	if(matches = info.match(/<table class="pagetext">.*?<tbody>(.*?)<\/tbody>/)){
		AnyBalance.trace('found table');
		var alltable = matches[1];
                var firstRow = getParam(alltable, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/i);
                var addcost = getParam(firstRow, result, 'addcost', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

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
				result.index = getParam(matches[3], null, null, /(.*)/, replaceTagsAndSpaces);
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
					attribute + (addcost ? ', Н/п ' + addcost + 'р' : '');
			}
			
			AnyBalance.setResult(result);
		}
	}
	
	if(!AnyBalance.isSetResultCalled())
		throw new AnyBalance.Error("Отправление не найдено.")
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value;
        var matches = regexp.exec (html);
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);
        }

    if(param)
      result[param] = value;
    return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function createFormParams(html, process){
    var params = {};
    html.replace(/<input[^>]+name="([^"]*)"[^>]*>/ig, function(str, name){
        var value = getParam(str, null, null, /value="([^"]*)"/i, null, html_entity_decode) || '';
        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        params[name] = value;
    });
    return params;
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

