/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://ib.homecredit.ru/ibs/';

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var form = getParam(html, null, null, /(<form[^>]+class="aui-form[\s\S]*?<\/form>)/i);
    if(!form) {
		if(/Услуга временно недоступна\.\s*Приносим извинения за доставленные неудобства\./i.test(html))
			throw new AnyBalance.Error('Уважаемый Клиент! Услуга временно недоступна. Приносим извинения за доставленные неудобства. Информацию о продуктах и услугах Вы сможете найти на нашем сайте: www.homecredit.ru');
			
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
	}
    var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, null, html_entity_decode);
    var params = createFormParams(form, function(params, input, name, value){
        var undef;
        if(/login/i.test(name))
            value = prefs.login;
        else if(/password/i.test(name))
            value = prefs.password;
        return value;
    });

    var html = AnyBalance.requestPost(action, params, g_headers);

    if(/<form[^>]+action="[^"]*changepassword/i.test(html))
        throw new AnyBalance.Error('Интернет банк настаивает на смене пароля. Пожалуйста, войдите в интернет-банк через браузер, смените пароль, а затем введите новый пароль в настройки провайдера.');

    if(!/portal\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*portlet-msg-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    if(prefs.type == 'crd')
        fetchCredit(baseurl, html);
    else if(prefs.type == 'acc')
        fetchAccount(baseurl, html);
    else if(prefs.type == 'card')
        fetchCard(baseurl, html);
    else if(prefs.type == 'dep')
        fetchDeposit(baseurl, html);
    else if(prefs.type == 'crd')
        fetchCredit(baseurl, html);
    else
        fetchDeposit(baseurl, html); //По умолчанию депозит
}

function fetchCard(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    //if(prefs.contract)
        //throw new AnyBalance.Error('В данной версии не поддерживается поиск по ID продукта, свяжитесь с разработчиками.');
    
    var result = {success: true};
    
    getParam(html, result, '__tariff', />\s*Карта([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accname', />\s*Карта([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /class="C"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', '__tariff'], /class="C"[^>]*>[^>]*class='([^']+)'/i, replaceTagsAndSpaces);
	getParam(html, result, 'accnum', /Номер счета:?[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'limit', /Кредитный лимит([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'minpaytill', /Дата списания следующего платежа(?:[^>]*>){7}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'minpay', /Дата списания следующего платежа(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'overall_debt', /Задолженность на конец завершенного периода(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	var limit = getParam(html, null, null, /Кредитный лимит([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	if(/>\s*Кредитная карта\s*</i.test(html) && limit && AnyBalance.isAvailable('debt')){
		var balance = getParam(html, null, null, /class="C"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		result.debt = limit - balance;
	}
	
    AnyBalance.setResult(result);
}

// Они все поменяли
function fetchCardOld(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');
    
    var cardnum = prefs.contract ? prefs.contract : '\\d{4}';
    var re = new RegExp('(<a[^>]+id="[^"]*(?:debit|credit)Card_\\d+"[^>]*class="[^"]*selectProduct[^"]*"(?:[\\s\\S](?!</a>))*\\d{4}\\s+\\d{2}\\*{2}\\s+\\*{4}\\s+' + cardnum + '[\\s\\S]*?</a>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));
	
    var isCredit = /<a[^>]+id="[^"]*creditCard_\d+"/.test(tr); 
    //FIXME: судя по депозиту и кредиту надо проверять наличие класса productBlockActive именно у нужной карты. А здесь странно как-то. Наверху в id есть Card, а здесь нет. Так что для карт надо бы перепроверить.
    //Проверим, выбран ли сейчас интересующий нас продукт. Для этого ищем, какой именно блок включает наш продукт
    var reProductBlock = new RegExp('<div[^>]+class="productBlock\\s+([^"]*)(?:[\\s\\S](?!</a>))*?<a[^>]+id="[^"]*' + (isCredit ? 'credit' : 'debit') + '(?:Card)?_\\d+"', 'i');
    var selected = getParam(html, null, null, reProductBlock);
    var isProductSelected = selected && /productBlockActive/i.test(selected);
	
    var result = {success: true};
    
    getParam(tr, result, '__tariff', /<td[^>]+class="productInfo"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /<td[^>]+class="productInfo"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /<td[^>]+class="productAmount"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /<td[^>]+class="productAmount"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    var balance = getParam(tr, null, null, /<td[^>]+class="productAmount"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    if(AnyBalance.isAvailable('own', 'agreement', 'status', 'accnum', 'limit', 'blocked', 'minpaytill', 'minpay', 'debt')){
        //Проверим выбран ли текущий продукт и нужный вклад внутри него
        var isSelected = isProductSelected && getParam(tr, null, null, /<span[^>]+class="(selected)"/i);
        if(!isSelected){
            html = requestDetails(html, tr);
        }
		
        getParam(html, result, 'own', /Остаток собственных средств на счете[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'limit', /(?:Лимит овердрафта:|Кредитный лимит)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'agreement', /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'blocked', /Остаток собственных средств на счете[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'status', /Статус карты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'accnum', /Номер счета:?[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'minpaytill', /(?:Дата платежа|Рекомендуемая дата внесения средств)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'minpay', /(?:Сумма минимального платежа|Сумма следующего платежа)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'overall_debt', /Общая задолженность[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		
        var limit = getParam(html, null, null, /(?:Лимит овердрафта:|Кредитный лимит)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        if(isCredit && limit && AnyBalance.isAvailable('debt')){
            result.debt = limit - balance;
        }
    }
	
    AnyBalance.setResult(result);
}

//Получаем детали по продукту, если он не выбран. tr - блок продукта
function requestDetails(html, tr){
    var source = getParam(tr, null, null, /PrimeFaces.\w+\s*\([^"]*source\s*:\s*'([^']*)/i, null, html_entity_decode);
    var formId = getParam(source, null, null, /^.*j_idt\d+/i);
    var form = getParam(html, null, null, new RegExp('(<form[^>]+id="' + formId + '"[\\s\\S]*?<\\/form>)', 'i'));
    var action = getParam(form, null, null, /<form[^>]+action="[^"]*/i, null, html_entity_decode);
    var params = createFormParams(form);
    params['javax.faces.partial.ajax'] = true;
    params['javax.faces.source'] = source;
    params['javax.faces.partial.execute'] = '@all';
    params[source] = source;
    html = AnyBalance.requestPost(params['javax.faces.encodedURL'] || action, params);
    return html;
}

function fetchAccount(baseurl, html){
    throw new AnyBalance.Error('Счета пока не поддерживаются. Обращайтесь к автору провайдера по е-мейл для исправления.');

    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.contract || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;
}

function createProductsIds(html, result){
    if(AnyBalance.isAvailable('all')){
        var all = [], types = {
           deposit: 'Депозит',
           loan: 'Кредит'
        }; 
        html.replace(/<a[^>]+id="[^"]*:([^":]+)_(\d+)"[^>]*class="[^"]*selectProduct[^"]*"[\s\S]*?<\/a>/ig, function(str, type, id){
            var name = getParam(str, null, null, /<td[^>]+class="productInfo"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            if(types[type]){
                all[all.length] = types[type] + ': ' + id + ' — ' + name;
            }else{
                AnyBalance.trace('Пропускаем неизвестный тип: ' + type + ', ' + name);
            }
        });
        if(all)
            result.all = all.join(',\n');
    }
        
}

function fetchDeposit(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    //if(prefs.contract && !/^\d{1,20}$/.test(prefs.contract))
        //throw new AnyBalance.Error('Пожалуйста, введите ID вклада, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому вкладу.');

    var result = {success: true};
    
    getParam(html, result, '__tariff', /class="N">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accname', /class="N">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /class="C"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', '__tariff'], /class="C"[^>]*>[^>]*class='([^']+)'/i, replaceTagsAndSpaces);
	getParam(html, result, 'accnum', /Номер счета:?[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'rate', /Процентная ставка(?:[^>]*>){7}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'pcts', /Сумма начисленных процентов(?:[^>]*>){7}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'agreement', /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'till', /Дата закрытия[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}

function fetchCredit(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{1,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите ID кредита, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому кредиту.');

    var re = new RegExp('(<a[^>]+id="[^"]*loan_' + (prefs.contract ? prefs.contract : '\\d+') + '"[^>]*class="[^"]*selectProduct[^"]*"[\\s\\S]*?<\\/a>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит с ID ' + prefs.contract : 'ни одного кредита'));
    var id = getParam(tr, null, null, /<a[^>]+id="[^"]*loan_(\d+)"/i);

    var selected = getParam(html, null, null, new RegExp('<div[^>]+class="productBlock\\s+([^"]*)(?:[\\s\\S](?!</a>))*?<a[^>]+id="[^"]*loan_' + id + '"', 'i'));
    var isProductSelected = selected && /productBlockActive/i.test(selected);

    var result = {success: true};
    
    createProductsIds(html, result);

    getParam(tr, result, '__tariff', /<td[^>]+class="productInfo"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /<td[^>]+class="productInfo"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /<td[^>]+class="productAmount"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /<td[^>]+class="productAmount"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

    if(AnyBalance.isAvailable('minpaytill', 'minpay', 'accnum', 'agreement', 'till', 'status')){
        //Проверим выбран ли текущий продукт и нужный кредит внутри него
        var isSelected = isProductSelected && getParam(tr, null, null, /<span[^>]+class="(selected)"/i);
        if(!isSelected){
            html = requestDetails(html, tr);
        }

        getParam(html, result, 'minpaytill', /Рекомендованная дата платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'minpay', /<td[^>]*bold[^>]*>(?:[\s\S](?!<\/td>))*?Сумма следующего платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'accnum', /Счет для платежей[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'agreement', /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'till', /Дата последнего платежа по графику[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'status', /Статус договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'notpaid', /Не выплачено[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
