/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у на лицевом счете корпоративного тарифа сотового оператора МТС. Вход через корпоративный личный кабинет.

Сайт оператора: http://mts.ru/
Личный кабинет: https://ihelper.mts.ru/Ncih/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
    return time;
}

function getHierarchyId(html){
    var availableHierarchy = getParam(html, null, null, /availableHierarchy:\s*(\[[^\]]*\])/);
    if(!availableHierarchy)
        throw new AnyBalance.Error("Не удалось найти верхний уровень иерархии.");

    AnyBalance.trace("Найдены иерархии: " + availableHierarchy);
    
    try{      
        availableHierarchy = new Function("return " + availableHierarchy)();
    }catch(e){
        throw new AnyBalance.error("Не удалось получить иерархию");
    }

    var baseid;
    for(var i=0; i<availableHierarchy.length; ++i){
        var it = availableHierarchy[i];
        if(!baseid || it.name == 'Биллинговая')
            baseid = it.id;
    }

    if(!baseid)
        throw new AnyBalance.error("Иерархия, похоже, пуста!");
    
    //Теперь у нас в baseid лежит id иерархии
    return baseid;
}

function main(){
    var baseurl = "https://ihelper.mts.ru/Ncih/";
    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "Security.mvc/LogOn", {
        Name:prefs.login,
        Password:prefs.password
    });
    
    //Проверим, залогинились ли
    var error = getParam(html, null, null, /<div[^>]*class="(?:b_error|b_warning)"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var hierid = getHierarchyId(html);
    
    var findnum = prefs.num || prefs.login;
    var json = AnyBalance.requestPost(baseurl + 'Hierarchy.mvc/GetHierarchyNodes', {
        from:0,
        to:299,
        filter:findnum,
        id:hierid,
        markCurrentSelection:true
    });

    AnyBalance.trace('Got hierarchy nodes for ' + findnum + ': ' + json);
    var info = JSON.parse(json);
    if(!info.totalCount){
        throw new AnyBalance.Error("Ошибка поиска информации по номеру или счету " + info);
    }

    var result = {success: true}

    var hasPhone = false;
    for(var i=0; i<info.totalCount; ++i){
        var node = info.nodes[i];
        if(node.data.type == 'TerminalDevice'){
            hasPhone = true;
        }
    }

    var accNode = null, phoneNode = null;
    for(var i=0; i<info.totalCount; ++i){
        var node = info.nodes[i];
        if(node.data.type == 'Holding' && AnyBalance.isAvailable('holding')){
            result.holding = node.text;
        }
        if(node.data.type == 'Account'){
            accNode = node;
            if(AnyBalance.isAvailable('Account'))
                result.account = node.text;
            if(!hasPhone)
                break; //Если телефонов нет, значит, получаем инфу об аккаунте
        }
        if(node.data.type == 'TerminalDevice'){
            phoneNode = node;
            if(AnyBalance.isAvailable('phone'))
                result.phone = node.text;
            break; //только первый телефон получаем
        }
        if(node.data.type == 'Contract' && AnyBalance.isAvailable('contract')){
            result.contract = node.text;
        }
    }

    if(!accNode && !phoneNode)
        throw new AnyBalance.Error("Не найдено ни одного счета или телефона с номером " + findnum);

    if(accNode && AnyBalance.isAvailable('balance', 'billing', 'acc_expences', 'last_pay_date', 'last_pay', 'debt', 'promise', 'promiseDate')){
        var accInfo = AnyBalance.requestPost(baseurl + 'ObjectInfo.mvc/PersonalAccount', {objectId:accNode.data.objectId});
        accInfo = JSON.parse(accInfo);
        if(accInfo.success){
            var html = accInfo.infoHtml;
            result.__tariff = accNode.text;
            getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'billing', /Метод расчетов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, 'acc_expences', /Израсходовано за период[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'last_pay_date', /Дата последней оплаты счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'last_pay', /Сумма последней оплаты счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'debt', /Сумма по неоплаченным счетам[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'promise', /Сумма обещанного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'promiseDate', /Срок действия обещанного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        }else{
            AnyBalance.trace("Не удалось получить информацию по счету " + accNode.text + ": " + accInfo.errorMessage);
        }
    }
   
    if(phoneNode){
        var phoneInfo = AnyBalance.requestPost(baseurl + 'ObjectInfo.mvc/Phone', {objectId:phoneNode.data.objectId});
        phoneInfo = JSON.parse(phoneInfo);
        if(phoneInfo.success){
            var html = phoneInfo.infoHtml;
            getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, 'expences', /Израсходовано по номеру[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }else{
            AnyBalance.trace("Не удалось получить информацию по номеру " + phoneNode.text + ": " + phoneInfo.errorMessage);
        }
    }
   
    AnyBalance.setResult(result);
}
