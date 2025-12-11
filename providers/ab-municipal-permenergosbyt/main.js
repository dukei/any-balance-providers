/**
Показания счетчика Пермэнергосбыт (http://any-balance-providers.googlecode.com)

Получает баланс на счету оплаты электроэнергии

Operator site: http://permenergosbyt.ru/
Личный кабинет: http://lk.permenergosbyt.ru/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

function redirectIfNeeded(html){
    if(/document.forms\[0\].submit/i.test(html)){
    	AnyBalance.trace('Потребовался редирект формой...');
    	var params = createFormParams(html);
    	var action = getParam(html, /<form[^>]+action=['"]([^'"]*)/, replaceHtmlEntities);
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestPost(joinUrl(url, action), params, addHeaders({Refefer: url}));
    }
    var redir = getParam(html, /<meta[^>]+http-equiv="REFRESH"[^>]*content="0;url=([^";]*)/i, replaceHtmlEntities);
    if(redir){
    	AnyBalance.trace('Потребовался get редирект...');
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestGet(joinUrl(url, redir), addHeaders({Refefer: url}));
    }
    return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.phone, 'Введите телефон!');

    var baseurl = "https://lk.permenergosbyt.ru/";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'personal/show', {
        "action": 'login',
        "login": prefs.login,
        "phone": prefs.phone
    }, addHeaders({Referer: baseurl + 'personal/show'}));
    html = redirectIfNeeded(html);

    var form = getElement(html, /<form[^>]+(?:name="auth")/i);
    var reAccount = /Лицевой счёт\: (\d+)/i;

    if (form || !/action="logout"/i.test(html), !reAccount.test(html)) {
        var error = getElement(html, /<div[^>]+(?:alert-warning)[^>]*>/i, replaceTagsAndSpaces);
        if (error)
			throw new AnyBalance.Error(error.replace('×', ''), null, /неверн|номер/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    // Получим список лицевых счетов
    /* Вообще-то список уже есть на странице, но там только id, номер, ФИО
       А на странице со списком ЛС ещё есть адрес и вид услуги (типа, тариф) */
    html = AnyBalance.requestGet(baseurl + 'personal/show?action=new_incdec', g_headers);
    // Основной лицевой счёт вывели отдельно, поэтому ищем в родительском блоке
    var table = getElement(html, /<div[^>]+(?:class="main-container")/i);

    var rows = getElements(table, /<div[^>]+(?:class="[^"]+ie-block")/ig);
    AnyBalance.trace('Найдено ' + rows.length + ' ЛС.');

    if (rows.length < 1) {
        throw new AnyBalance.Error('У вас нет ни одного лицевого счета!');
    }

    var current_account;
    for (var i = 0; i < rows.length; i++) {
        var account_number = getElement(rows[i], /<span class="text-big"/i, replaceTagsAndSpaces);
        AnyBalance.trace(account_number);
        if (!current_account && (!prefs.num || endsWith(account_number, prefs.num))) {
            AnyBalance.trace('Выбран ' + account_number);
            current_account = {'account_number': account_number};
            // У основного счёта теперь нет кнопки перехода и, соотвтственно, acc_id
            submatches = rows[i].match(/<button[^>]+data-account="(\d+)"/i);
            if (submatches != null) {
                current_account.acc_id = submatches[1];
            }
            // Также у основного счёта нет поля "Вид услуги"
            current_account.service = "Основной счёт"; // Значение по умолчанию
            let matches = rows[i].matchAll(/<strong>([^<]+)<\/strong>\s*<span>([^<]+)<\/span>/ig);
            for (const match of matches) {
                if (match[1] == 'ФИО ') {
                    current_account.fio = match[2];
                }
                if (match[1] == 'Адрес ') {
                    current_account.address = match[2];
                }
                if (match[1] == 'Вид услуги ') {
                    current_account.service = match[2];
                }
            }
        }
    }

    if(!current_account) {
        throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
    }

    // К основному счёту не переходим
    if (current_account.acc_id != undefined) {
        // Переход к нужному лицевому счёту
        var xhr = AnyBalance.requestPost(baseurl + 'bb/ShowProc2/web.lk_account_related', {
            go_lk_acc_id: current_account.acc_id
        }, {'X-Requested-With': 'XMLHttpRequest'});
    }

    html = AnyBalance.requestGet(baseurl + 'personal/show?account=info', g_headers);

    var result = {success: true};

    result.__tariff = current_account.service;
    result.account = current_account.account_number;

    // Не учитывает положительный баланс (переплату)
    // result.balance = -getParam(html, null, null, /<tr[^>]+class="tr-pay-total"+>.*?<\/tr>/i, replaceTagsAndSpaces, parseBalance);
    // Возьмём сумму из модального окна "Детальная информация"
    var table = getElement(html, /<div[^>]+id="modal-help-balance"[^>]*>[\s\S]*?<table[^>]+class="table table-xs-line"[^>]*>/i);
    var trs = getElements(table, /<tr>(.*)<\/tr>/ig);
    result.balance = 0;
	for (var i = 0; i < trs.length; i++) {
        result.balance += getParam(trs[i], null, null, '', [replaceTagsAndSpaces, /задолженность/i, '-', /переплата/i, ''], parseBalance);
	}
	// Информация по приборам учета
	var table = getElement(html, /<table[^>]+id="single-header-measures-\d+"[^>]*>/i);
    var trs = getElements(table, /<tr[^>]+class="info"[^>]*>/ig);
	
	if(trs && trs.length && trs.length > 0){
	    AnyBalance.trace('Найдено счетчиков: ' + trs.length);
	    for (var i = 0; i < trs.length; i++) {
		    var counter = trs[i];
		    var ctype = (i >= 1 ? 'countertype' + (i + 1) : 'countertype');
	        var ctariff = (i >= 1 ? 'countertariff' + (i + 1) : 'countertariff');
	        var crate = (i >= 1 ? 'counterrate' + (i + 1) : 'counterrate');
	        var cdateset = (i >= 1 ? 'counterdateset' + (i + 1) : 'counterdateset');
	        var cdateterm = (i >= 1 ? 'counterdateterm' + (i + 1) : 'counterdateterm');
		    var cvalency = (i >= 1 ? 'countervalency' + (i + 1) : 'countervalency');
		    var cnum = (i >= 1 ? 'counternum' + (i + 1) : 'counternum');
		    
            getParam(counter, result, ctype, /<tr(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
	        getParam(counter, result, ctariff, /<tr(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
	        getParam(counter, result, crate, /<tr(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /\s+/ig, '']);
	        getParam(counter, result, cdateset, /<tr(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	        getParam(counter, result, cdateterm, /<tr(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
		    getParam(counter, result, cvalency, /<tr(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		    getParam(counter, result, cnum, /<tr(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	    }
	}else{
		AnyBalance.trace('Не удалось получить информацию по счетчикам');
	}
	
    result.fio = current_account.fio;
    result.address = current_account.address;
	
	// Резервные способы получения счетчиков
//	getParam(html, result, 'account', /<div[^>]+class="account-num-text"[^>]*>[\s\S]*?Лицевой сч[её]т:[\s\S]*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
//	getParam(html, result, 'date', /alert.*?\:\s+(.+?)<\/strong>/i, replaceTagsAndSpaces, parseDate);
//	getParam(html, result, 'address', /<div[^>]+class="client-adress"[^>]*>[\s\S]*?Адрес:[\s\S]*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
//	getParam(html, result, 'fio', /<div[^>]+class="client-name"[^>]*>[\s\S]*?ФИО:[\s\S]*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	getParam(html, result, 'email', /<span[^>]+class="ic-email-val"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	if(prefs.phone){
	    getParam(prefs.phone, result, 'phone', null, replaceNumber);
	}else{
		getParam(html, result, 'phone', /<span[^>]+class="ic-phone-val"[^>]*>([\s\S]*?)<\/span>/i, replaceNumber);
	}
	
	if(AnyBalance.isAvailable(['countervalue', 'countervalue1', 'countervalue2'])){
	    html = AnyBalance.requestGet(baseurl + 'personal/show?action=measures', g_headers);
	    
	    // Показания приборов учета
	    var table = getElement(html, /<table[^>]+id="single-header-example-\d+"[^>]*>/i);
        var trs = getElements(table, /<tr[^>]+class="info measure_tbl"[^>]*>/ig);
	    
		if(trs && trs.length && trs.length > 0){
		    AnyBalance.trace('Найдено показаний счетчиков: ' + trs.length);
            for (var i = 0; i < trs.length; i++) {
		        var counter = trs[i];
	            var cvalue = (i >= 1 ? 'countervalue' + (i + 1) : 'countervalue');
		        
		        getParam(counter, result, cvalue, /<tr(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	        }
		}else{
			AnyBalance.trace('Не удалось получить показания счетчиков');
		}
	}
	
	// Получаем историю платежей
	if(AnyBalance.isAvailable(['lastopertype', 'lastoperdate', 'lastopersum'])){
	    var dt = new Date();
        var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-3, '01');
        var dateFrom = n2(dtPrev.getDate()) + '.' + n2(dtPrev.getMonth()+1) + '.' + dtPrev.getFullYear();
		var dateTo = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear();
		
		html = AnyBalance.requestGet(baseurl + 'personal/show?action=charges&active_from=' + dateFrom + '&active_to=' + dateTo, g_headers);
	    var table = getElement(html, /<table[^>]+id="single-header-payment-\d+"[^>]*>/i);
        var trs = getElements(table, /<tr[^>]+class="footable-partdisabled[^>]*>/ig);
	
	    if(trs && trs.length && trs.length > 0){
			AnyBalance.trace('Найдено операций: ' + trs.length);
		    for(var i=0; i<trs.length; ++i){
	    	    var operation = trs[i];
                
                getParam(operation, result, 'lastopertype', /<tr(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	    	    getParam(operation, result, 'lastoperdate', /<tr(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, parseDate);
	    	    getParam(operation, result, 'lastopersum', /<tr(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
                
                break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить историю операций');
		}
	}

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
