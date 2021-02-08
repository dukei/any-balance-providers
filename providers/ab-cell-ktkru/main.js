var g_Headers = {
    Connection: 'keep-alive',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	Origin: 'https://lk.ktkru.ru',
	'Accept-Encoding': null,
	'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0; ONEPLUS A3010 Build/OPR6.170623.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Crosswalk/18.48.477.13 Mobile Safari/537.36',
	'Content-Type': 'application/x-www-form-urlencoded',
	DNT:1
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var tel=prefs.login.replace(/[^\d]*/g,'');
    if (/^\d{10}$/.test(tel)) tel='7'+tel;
    if (!/\d{11}/.test(tel)) throw new AnyBalance.Error('Введите в настройках номер телефона 11 цифр. Например 79781234567',false,true);
    var baseurl='https://lk.ktkru.ru/';
    AnyBalance.setDefaultCharset('utf-8');
    var html=AnyBalance.requestGet(baseurl+'group/ktkru/service',g_Headers);
    //AnyBalance.trace(html);
    var form = AB.getElement(html, /<form[^>]+form sign-in-form[^>]*>/i);
    if (form){
	   var params = createFormParams(form, function(params, str, name, value) {
		AnyBalance.trace('Processing form field ' + name + ': ' + value);
		if (/_login/i.test(name)) 
			return tel;
		else if (/password/i.test(name))
			return prefs.password;
		else if (/submit/i.test(name))
			return undefined;
		return value;
	   });
    	var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    	var html=AnyBalance.requestPost(action,params,g_Headers);
	//AnyBalance.trace(html);
    }
    if (!/c\/portal\/logout/i.test(html)) 
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет',false,true);

    var form = AB.getElement(html, /<form[^>]+frm_contracts[^>]*>/i);
    var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    var contracts=AB.getElement(form, /<select[^>]+id_contract[^>]*>/i).match(/(?<=value=")([^"]*)/g);
   AnyBalance.trace( contracts);
    if (!contracts)
    	throw new AnyBalance.Error('Не удалось получить прочитать меню выбора контрактов',false,true);

    var result = {success: true};

    for (var i=0;i<contracts.length && i<5;i++) {
    	if (!isAvailable('balance'+i,'phone'+i,'tarif'+i,'sum'+i,'contract'+i,'inet'+i,'minute'+i,'date_inet'+i,'date_minute'+i,)){
    		AnyBalance.trace('Все счетчики по контракту ID='+contracts[i]+' отключены. Пропускаем');
    		continue;
    	}
    	AnyBalance.trace('Полуение балансов для контракта ID='+contracts[i]);
    	html=AnyBalance.requestPost(action,{id_contract:contracts[i]}); 
    	//AnyBalance.trace(html);
    	getParam1(html,result,'balance'+i,/<br> Баланс:[^>]*?>([^<]*)/,replaceTagsAndSpaces,parseBalance);
    	getParam1(html,result,'phone'+i,/idents">([^<]*)/,replaceTagsAndSpaces,null);
    	getParam1(html,result,'tarif'+i,/name-add">[^\d]*[^\|]*\|([^\|]*)/,replaceTagsAndSpaces,null);
    	getParam1(html,result,'sum'+i,/name-add">[\s\S]*?sum">([^<]*)/,replaceTagsAndSpaces,parseBalance);
    	var re=new RegExp('value="'+contracts[i]+'[^>]*>([^<]*)');
    	getParam1(html,result,'contract'+i,re,replaceTagsAndSpaces,null);
    	var rows=getParam(html, /Дополнительные балансы[\s\S]*?tbody>([\s\S]*?)<\/tbody/i, replaceHtmlEntities);
        rows=rows.match(/<tr[\s\S]*?<\/tr>/g);
        rows.forEach (getDopBalance);
   }

    getParam1(html,result,'fio',/user-full-name">([^<]*)/,replaceTagsAndSpaces);

    AnyBalance.setResult(result);
 

function getDopBalance(row){
	var cells=row.match(/(?<=<td[^>]*?>)([^\<]*?)(?=<)/g);
	AnyBalance.trace('Обработка баланса: '+ cells[0] + ': '+cells[1]+' '+cells[2]+' ' +cells[3]+' ' +cells[4]);
	if (/Гб/i.test(cells[0])){
		getParam1(cells[1],result,'inet'+i,null,null,parseBalance);
                getParam1(cells[3],result,'date_inet'+i,null,null,parseDate);
                AnyBalance.trace('Это гигабайты');
        }else if (/минут/i.test(cells[0])){
		getParam1(cells[1],result,'minute'+i,null,null,parseBalance);
                getParam1(cells[3],result,'date_minute'+i,null,null,parseDate);
                if (/секунд/i.test(cells[2])&&result['minute'+i]) result['minute'+i]=(parseFloat(result['minute'+i])/60).toFixed();
                AnyBalance.trace('Это секунды. Пересчитаны в минуты и округлены.');
        }else{
        	AnyBalance.trace('Неизвестный баланс.');
        }
        if(prefs.prefix==1) 
        	result['pretel'+i]=result['phone'+i]+': ';
        else if (prefs.prefix==2) 
        	result['pretel'+i]=result['contract'+i]+': ';
}


}

    function getParam1(html, result, param, regexp, replaces, parser) {
    	if (result instanceof RegExp || isArray(result)){
    		//Пропустили два параметра (result и param), остальные надо сдвинуть
    		parser = regexp;
    		replaces = param;
    		regexp = result;
    		result = param = null;
    	}
    		
        if (!isset(html)) {
            AnyBalance.trace('getParam: input ' + (param ? '(' + param + ')' : '') + ' is unset! ' + new Error().stack);
            return;
        }
        if(html === null && regexp){
            AnyBalance.trace('getParam: input ' + (param ? '(' + param + ')' : '') + ' is null! ' + new Error().stack);
            return;
        }

/*        if (!isAvailable(param)) {
            AnyBalance.trace(param + ' is disabled!');
            return;
        }
*/
        var regexps = isArray(regexp) ? regexp : [regexp];
        for (var i = 0; i < regexps.length; ++i) { //Если массив регэкспов, то возвращаем первый заматченный
            regexp = regexps[i];
            var matches = regexp ? html.match(regexp) : [, html], value;
            if (matches) {
                //Если нет скобок, то значение - всё заматченное
                value = replaceAll(isset(matches[1]) ? matches[1] : matches[0], replaces);
                if (parser)
                    value = parser(value);
                if (param && isset(value))
                    result[__getParName(param)] = value;
                break;
            }
        }
        return value;
    }
    function __getParName(param) { //Возвращает для параметра имя после последней точки
        var name = isArray(param) ? param[0] : param;
        return name && name.substr(name.lastIndexOf('.') + 1); //Оставляем только хвост до точки
    }
