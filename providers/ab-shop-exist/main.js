/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/) || getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
}

function parseDateMy(str) {
	var val;
	if (/Завтра/i.test(str)) {
		var dt = new Date();
		val = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
	} else if (/Сегодня/i.test(str)) {
		var dt = new Date();
		val = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
	} else {
		return parseDateWord(str);
	}
	AnyBalance.trace("Parsed " + val + " from " + str);
	return val && val.getTime();
}

Array.prototype.contains = function(k) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] === k) {
			return true;
		}
	}
	return false;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "http://www.exist.ru/Profile/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx', g_headers);
	
    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние цифры номера заказа или не вводите ничего, чтобы получить информацию по последнему заказу');
	
    var viewstate = getViewState(html);
    var eventvalidation = getEventValidation(html);
    if(!viewstate)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
    html = AnyBalance.requestPost(baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx', {
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:viewstate,
        __EVENTVALIDATION:eventvalidation,
        ctl00$ctl00$b$b$custLogin$txtLogin:prefs.login,
        ctl00$ctl00$b$b$custLogin$txtPassword:prefs.password,
        ctl00$ctl00$b$b$custLogin$bnLogin:'Ждите...'
    }, addHeaders({Referer: baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx'})); 
	
	if(!/\/exit.axd/i.test(html)){
		var error = getParam(html, null, null, /<span[^>]+id="lblError"[^>]*>([\s\S]*?)(?:<\/span>|<a[^>]+href=['"]\/howgetpass.aspx)/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var balance = getParam(html, null, null, /Средства на счету:([\s\S]+?)<\/b/i, replaceTagsAndSpaces, parseBalance);
	var debt = getParam(html, null, null, /Задолженность по заказам:([\s\S]+?)<\/b/i, replaceTagsAndSpaces, parseBalance);
	
    getParam(balance, result, 'balance');
    getParam(debt, result, 'debt');
    if(isset(balance) && isset(debt))
 	    getParam(balance - debt, result, 'balance_total');
	
	html = AnyBalance.requestGet(baseurl + 'default.aspx', g_headers);
    getParam(html, result, 'code', /код клиента[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /код клиента[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
	
	var singleOrder;


	// Новый формат, по всем позициям в заказе
	if (AnyBalance.isAvailable('ordernum', 'ordersum', 'orderdesc', 'orderstatus', 'orderexpect', 'parts_count', 'place')) {
    	html = AnyBalance.requestGet(baseurl + 'Orders/default.aspx', g_headers);

    	var ordersInfo = getElement(html, /<div[^>]+class="data"[^>]*>/i);
    	var ordersGroups = getElements(ordersInfo, /<div[^>]+class="(?:ordergroup|row)[^>]*>/ig);

    	if(prefs.num){
	    	var nums = (prefs.num || '').split(/[\s,;]+/g), idx=0;
    		for(var i=0; i<nums.length; ++i){
    			findOrder(result, ordersGroups, nums[i], idx++);
    		}
    	}else{
    		for(var i=0; i<ordersGroups.length; i+=2){
    			findOrder(result, ordersGroups.slice(i), '', idx++);
    		}
    	}
    }
	
    AnyBalance.setResult(result);
}

function findOrder(result, ordersGroups, num, idx){
    var group, suffix = idx || '';
    for(var i=0; i<ordersGroups.length; ++i){
    	var g = ordersGroups[i];
    	if(/<div[^>]+ordergroup/i.test(g)){
    		//Это группа
    		group = g;
   			getParam(group, result, 'place' + suffix, /<div[^>]+office-name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    	}else{
    		//Это детали
    		var id = getParam(group, null, null, /<span[^>]+ordername[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    		if(!num || endsWith(id, num)){
    			//Это наш заказ. Обрабатываем
    			getParam(id, result, 'ordernum' + suffix);
    			getParam(g, result, 'orderstatus' + suffix, /<div[^>]+action-name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
				
				sumParam(g, result, 'ordersum' + suffix, /<div[^>]+orders-price[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum_round);
				sumParam(g, result, 'orderexpect' + suffix, /<span[^>]+orders-delivery-date[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseDateMy, aggregate_max);

				var htmlDesc = [];
				var rows = getElements(g, /<div[^>]+rowData[^>]*>/ig);
				var parts_count = 0;

				for(var j=0; j<rows.length; ++j){
					var row = rows[j];

					// Создаем новую сводку, вот такую 
					// <small>Van Wezel <b>5894915</b> (Центральный склад)<br>Фонарь указателя поворота зеркала левый</small>
					var vendorName = getParam(row, null, null, /<span[^>]+item-name[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces) || '';
					var artname = getParam(row, null, null, /<span[^>]+orders-art[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces) || '';
					var descript = getParam(row, null, null, /<div[^>]+orders-description[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces) || '';
					var count = getParam(row, null, null, /<div[^>]+orders-amount[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
				
					if(isset(count))
						parts_count += count;
				
					htmlDesc.push('<small>' + vendorName + ' <b>' + artname + '</b> ' + (isset(count) ? ' - '  + count + ' шт': '') + '<br/>' + descript + '</small>');
				}
				
				getParam(parts_count, result, 'parts_count' + suffix);
				getParam(htmlDesc.join('<br/>\n'), result, 'orderdesc' + suffix);
    		}
    		return;
    	}
    }

	AnyBalance.trace(prefs.num ? 'Не найдено активного заказа с последними цифрами ' + prefs.num : 'Не найдено ни одного активного заказа!');
}

function aggregate_sum_round(values) {
	if (values.length == 0)
		return;
	var total_value = 0;
	for (var i = 0; i < values.length; ++i) {
		total_value += values[i].toFixed(2)*1;
	}
	return total_value;
}

