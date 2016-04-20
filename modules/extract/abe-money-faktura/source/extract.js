/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

//Заменяем системную строку замен
var myReplaceTagsAndSpaces = [replaceTagsAndSpaces, /(\d)\-(\d)/g, '$1.$2'];
var g_baseurl = "https://www.faktura.ru/lite/app";

function login(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset("utf-8");
	
    var html = AnyBalance.requestGet(g_baseurl + "/pub/Login");
    
    var matches = /Wicket.Ajax.ajax\(\{"f":"id([^"]+)","\w":".\/([^"]+)/i.exec(html);
    if(!matches){
        var prof = getParam(html, null, null, /<title>(Профилактические работы)<\/title>/i);
        if(prof)
            throw new AnyBalance.Error("В настоящее время в системе Интернет-банк проводятся профилактические работы. Пожалуйста, попробуйте ещё раз позже.");
        throw new AnyBalance.Error("Не удаётся найти форму входа в интернет-банк! Сайт недоступен или изменения на сайте.");
    }
	
    var id = matches[1], href = matches[2];
    var params = {};
    params[id + "_hf_0"] = '';
    params.hasData = 'X';
    params.login = prefs.login;
    params.password = prefs.password;
	
    html = AnyBalance.requestPost(g_baseurl + '/pub/' + href, params);
	
    var error = getParam(html, null, null, /<span[^>]*class="feedbackPanelERROR"[^>]*>([\s\S]*?)(<script|<\/span>)/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error, null, /Неверно указан логин/i.test(error));
	
    var needsms = getParam(html, null, null, /(sms-message-panel|Введите SMS-код)/i);
    if(needsms)
        throw new AnyBalance.Error("Для работы этого провайдера требуется отключить в настройках интернет-банка подтверждение входа по СМС. Это безопасно, для совершения операций все равно будет требоваться подтверждение по СМС.");
	
    AnyBalance.trace("We seem to enter the bank...");
    return html;
}

function getCards(html, result){
	var cards = getElements(html, /<div[^>]+class="card"[^>]*>/ig);
	if(cards.length)
		result.cards = [];

	for(var i=0; i<cards.length; ++i){
		var c = {};
		var card = cards[i];

		getParam(card, c, 'accounts.cards.__id', /<div[^>]+class="card-info"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(card, c, 'accounts.cards.num', /<div[^>]+class="card-info"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(card, c, 'accounts.cards.name', /<div[^>]+class="card-info"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(card, c, 'accounts.cards.balance', /<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
		getParam(card, c, ['accounts.cards.currency', 'accounts.cards.balance'], /<span[^>]+class="currency"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, html_entity_decode);

		result.cards.push(c);
	}
}
	
function processAccounts(html, result){
    var html = AnyBalance.requestGet(g_baseurl + "/priv/accounts");

    getParam(html, result, 'total', /<span[^>]+class="total-block"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
    if(AnyBalance.isAvailable('total', 'currency'))
    	result.currency = getElement(html, /<span[^>]+class="total-block"[^>]*>/i, myReplaceTagsAndSpaces, parseCurrency);

    if(!AnyBalance.isAvailable('accounts'))
    	return;
	
	var accs = getElements(html, /<div[^>]+class="account-(?:block|history)"[^>]*>/ig);
	if(accs.length)
		result.accounts = [];

	for(var i=0; i<accs.length; i+=2){
	    var history = accs[i];
	    var acc = accs[i+1];

	    var num = getParam(acc, null, null, /<div[^>]+id="acc_([^"_]*)/i, null, html_entity_decode);
	    var name = getParam(acc, null, null, /<span[^>]+class="editable-name-block"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	    var a = {__id: num, __name: name + ' (' + num + ')'};
	    var cards = getCards(acc, a);
	    
	    if(__shouldProcess('accounts', a)){
	    	processAccount(acc, a, html);
	    	
	    	if(AnyBalance.isAvailable('accounts.minpay', 'accounts.minpay_till', 'accounts.transactions', 'accounts.address')){
	    		try{
	    			processAccountTransactions(history, a);
	    		}catch(e){
	    			AnyBalance.trace('Выписка не получена: ' + e.message);
	    		}
	    	}
	    }

	    result.accounts.push(a);
	}
}

function num2(n){
	return n < 10 ? '0' + n : '' + n;
}

function joinUrl(url, path){
	if(!path) //Пустой путь
		return url;
    if(path.startsWith('/')) //Абсолютный путь
    	return url.replace(/^(\w+:\/\/[\w.\-]+).*$/, '$1' + path);
    if(/^\w+:\/\//.test(path)) //Абсолютный урл
    	return path;
    //относительный путь
    url = url.replace(/\?.*$/, ''); //Обрезаем аргументы
    if(/:\/\/.*\//.test(url))
    	url = url.replace(/\/[^\/]*$/, '/'); //Сокращаем до папки
    return url + path;
}

function processAccountTransactions(html, result){
	var href = getParam(html, null, null, /div[^>]+class="more-operations[\s\S]*?href="([^"]*)/i, null, html_entity_decode);
	if(!href){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на выписку, сайт изменен?');
	}

	html = AnyBalance.requestGet(g_baseurl + "/priv/" + href);

	getParam(html, result, 'accounts.minpay', /<td[^>]*>Оплатить до[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /-/, ','], parseBalance);
	getParam(html, result, 'accounts.minpay_till', /<td[^>]*>Оплатить до([^<]+)/i, replaceTagsAndSpaces, parseDate);

	if(!AnyBalance.isAvailable('accounts.transactions', 'accounts.address'))
		return; //Дальше только транзакции

	var form = getElements(html, [/<form[^>]*>/ig, /Период выписки/i])[0];
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму выписки, сайт изменен?');
	}

	var href = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, null, html_entity_decode);
	var dt = new Date();

	var params = createFormParams(form, function(params, str, name, value) {
		if (/start/i.test(name)) 
			return num2(dt.getDate()) + '.' + num2(dt.getMonth()+1) + '.' + (dt.getFullYear()-3);
		else if (/end/i.test(name))
			return num2(dt.getDate()) + '.' + num2(dt.getMonth()+1) + '.' + dt.getFullYear();
	    else if(/id[^_]+_hf_/i.test(name)){
	    	params['p::submit'] = 'x'; //Для бинбанка
	    	value = undefined;
	    }

		return value;
	});

	params.periodType = 'radio53'; //У мдм и ртб
	
	html = AnyBalance.requestPost(joinUrl(AnyBalance.getLastUrl(), href), params);

	var href = getParam(html, null, null, /<a[^>]+href="([^"]*)"[^>]*class="[^"]*print/i, null, html_entity_decode);
	if(!href){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на печать выписки, сайт изменен?');
	}

	html = AnyBalance.requestGet(joinUrl(AnyBalance.getLastUrl(), href));
	var href = getParam(html, null, null, /<iframe[^>]+src="([^"]*)"[^>]*id="iframeId"/i, null, html_entity_decode);
	if(!href){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на iframe выписки, сайт изменен?');
	}

	html = AnyBalance.requestGet(joinUrl(AnyBalance.getLastUrl(), href));
	
	var table = getElements(html, [/<table[^>]*>/ig, /Дата операции/i])[0];
	if(!table){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку таблицу выписки, сайт изменен?');
	}

	getParam(html, result, 'accounts.address', /<td[^>]*>Адрес регистрации[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	result.transactions = [];

	var head = getParam(table, null, null, /<thead[^>]*>([\s\S]*?)<\/thead>/i);
	var colsa = getElements(head, /<th[^>]*>/ig, replaceTagsAndSpaces, html_entity_decode);
	var cols = {};
	for(var i=0; i<colsa.length; ++i){
		if(/Документ/i.test(colsa[i]))
			cols.doc = i;
		else if(/Дата операции/i.test(colsa[i]))
			cols.date = i;
		else if(/Списание|Расходы/i.test(colsa[i]))
			cols.off = i;
		else if(/Зачисление|Расходы/i.test(colsa[i]))
			cols.on = i;
		else if(/Контрагент/i.test(colsa[i]))
			cols.contra = i;
		else if(/Назначение|Детали операции/i.test(colsa[i]))
			cols.descr = i;
	}

	html = getParam(table, null, null, /<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
	var trs = getElements(html, /<tr[^>]*>/ig);
	for(var i=0; i<trs.length; ++i){
		var tds = getElements(trs[i], /<td[^>]*>/ig);
		if(tds.length < colsa.length)
			continue; //Вероятно, Итого

		var t = {};
		if(cols.hasOwnProperty('doc'))
			getParam(tds[cols.doc], t, 'accounts.transactions.doc', null, replaceTagsAndSpaces, html_entity_decode);
		if(cols.hasOwnProperty('date'))
			getParam(tds[cols.date], t, 'accounts.transactions.date', null, replaceTagsAndSpaces, parseDate);
		if(cols.hasOwnProperty('off'))
			getParam(tds[cols.off], t, 'accounts.transactions.sum', null, replaceTagsAndSpaces, function(str){
				var val = parseBalance(str);
				return val > 0 ? -val : val;
			});
		if(cols.hasOwnProperty('on'))
			getParam(tds[cols.on], t, 'accounts.transactions.sum', null, replaceTagsAndSpaces, parseBalance);
		if(cols.hasOwnProperty('contra'))
			getParam(tds[cols.contra], t, 'accounts.transactions.contra', null, replaceTagsAndSpaces, html_entity_decode);
		if(cols.hasOwnProperty('descr'))
			getParam(tds[cols.descr], t, 'accounts.transactions.descr', null, replaceTagsAndSpaces, html_entity_decode);

		result.transactions.push(t);
	}
}

function followAjaxUrl(id, html){
	var ajax = getParam(html, null, null, new RegExp('Wicket.Ajax.ajax\\(([^)]*"c":"' + id + '"[\\s\\S]*?\\})\\)'), null, getJsonEval);
	var base = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/, replaceSlashes);
	var extra = AnyBalance.requestGet(g_baseurl + "/priv/" + ajax.u, {
		'Wicket-Ajax': 'true',
		'Wicket-Ajax-BaseURL': base || 'priv/accounts?wicket-crypt=f6I5BkYr3fk',
		'X-Requested-With': 'XMLHttpRequest'
	});

	var redirect = getParam(extra, null, null, /<redirect>\s*<!\[CDATA\[([\s\S]*?)\]\]>/i);
	if(redirect)
		extra = AnyBalance.requestGet(g_baseurl + "/priv/" + redirect);

	return extra;
}

function processAccount(acc, result, html){
	var extra = getElements(acc, [/<div[^>]+class="closed"[^>]*>/ig, /Дополнительно/i])[0];
	if(extra){
		var extraId = getParam(extra, null, null, /<div[^>]+id="([^"]*)/i, null, html_entity_decode);
		extra = followAjaxUrl(extraId, html);
		acc += extra;
	}

    getParam(acc, result, 'accounts.balance', [
    		/Средств на счете[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, 
    		/<div[^>]+class="card-amounts"[^>]*>([\s\S]*?)<\/div>/i
    	], myReplaceTagsAndSpaces, parseBalance);
    getParam(acc, result, ['accounts.currency', 'accounts.own', 'accounts.credit_used', 'accounts.debt', 'accounts.limit'], /<span[^>]+class="currency"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(acc, result, 'accounts.own', /Остаток собственных средств[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(acc, result, 'accounts.credit_used', /Использованный кредит[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(acc, result, 'accounts.debt', /Начисленная задолженность[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(acc, result, 'accounts.limit', /Кредитный лимит[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);

	getParam(acc, result, 'accounts.name', /<span[^>]+class="editable-name-block"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	getParam(acc, result, 'accounts.num', /<td>Номер:[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(acc, result, 'accounts.currencyISO', /<td>Валюта:[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(acc, result, 'accounts.fio', /<td>Владелец:[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(acc, result, 'accounts.opened', /<td>Открыт:[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, parseDate);
}

function processInfo(html, result){
	if(AnyBalance.isAvailable('fio'))
		result.fio = getElement(html, /<span[^>]+class="name"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
}

function processTemplates(html, result){
	var templates = getElement(html, /<div[^>]+class="templates"[^>]*>/i);
	if(templates)
		result.templates = [];

	var tpls = getElements(templates, /<li[^>]*>/ig);
	for(var i=0; i<tpls.length; ++i){
		var tpl = tpls[i];
		if(/<li[^>]+class="create"/i.test(tpl))
			continue; //Ссылка на создание шаблона
		
		var name = getParam(tpl, null, null, /<a[^>]+class="template-name[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
		var t = {__id: name, __name: name};

		if(__shouldProcess('templates', t)){
			processTemplate(tpl, t, html);
		}

		result.templates.push(t);
	}
}

function processTemplate(tpl, result, html){
	if(!AnyBalance.isAvailable('templates'))
		return;

	var hrefId = getParam(tpl, null, null, /<a[^>]+class="template-name"[^>]*id="([^"]*)/i, null, html_entity_decode);

	var tpl = followAjaxUrl(hrefId, html);

	getParam(tpl, result, 'type', /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);

	var fieldsets = getElements(tpl, /<fieldset[^>]*>/ig);
	if(fieldsets.length)
		result.fieldsets = [];

	for(var i=0; i<fieldsets.length; ++i){
	    var fldset = fieldsets[i];
	    if(/<fieldset[^>]+class="submit"/i.test(fldset))
	    	continue; //Кнопки не нужны
	    if(/<span>Имя платежа<\/span>/i.test(fldset))
	    	continue; //Имя платежа не нужно

		var fs = {};
		getParam(fldset, fs, 'templates.fieldsets.name', /<legend[^>]*>([\s\S]*?)<\/legend>/i, replaceTagsAndSpaces, html_entity_decode);

		var fields = getElements(fldset, /<(?:label|div)[^>]*>/ig);
		if(!fields.length)
			continue;
		
		fs.fields = [];

		for(var j=0; j<fields.length; j+=2){
			var label = fields[j];
			var field = fields[j+1];

			if(/^<div/i.test(label)){
				j--;
				field = getElement(label, /<div[^>]+inside-div[^>]*>/i);
				label = getElement(label, /<label[^>]+inside-div[^>]*>/i);
			}

			if(/^<[^>]*display:none/i.test(field) && /^<[^>]*display:none/i.test(label))
				continue; //Скрытое поле какое-то

			var f = {};
			getParam(label, f, 'templates.fieldsets.fields.name', null, replaceTagsAndSpaces, html_entity_decode);
			getParam(label, f, 'templates.fieldsets.fields.required', /<label[^>]+required/i, null, function(str){return !!str});

			if(/<input[^>]+type="radio"/i.test(field)){
				getParam(field, f, 'templates.fieldsets.fields.id', /<input[^>]+type="radio"[^>]*name="([^"]*)/i, null, html_entity_decode);
				var options = sumParam(field, null, null, /<(?:input|label)[\s\S]*?<\/(?:span|div)/ig);

				for(var k=0; k<options.length; ++k){
					var o = {};
					getParam(options[k], o, 'templates.fieldsets.fields.options.value', /<input[^>]+type="radio"[^>]*value="([^"]*)/i, null, html_entity_decode);
					getParam(options[k], o, 'templates.fieldsets.fields.options.name', /<label[^>]*>[\s\S]*?<\/label>/i, replaceTagsAndSpaces, html_entity_decode);

					getParam(options[k], o, 'templates.fieldsets.fields.extra_id', /<input[^>]+type="text"[^>]*name="([^"]*)/i, null, html_entity_decode);
					getParam(options[k], o, 'templates.fieldsets.fields.extra_value', /<input[^>]+type="text"[^>]*value="([^"]*)/i, null, html_entity_decode);
					getParam(options[k], o, 'templates.fieldsets.fields.extra_comment', /<input[^>]+type="text"[^>]*title="([^"]*)/i, null, html_entity_decode);

					if(/checked/i.test(options[k])){
						getParam(options[k], o, 'templates.fieldsets.fields.options.value', /<input[^>]+type="radio"[^>]*value="([^"]*)/i, null, html_entity_decode);
						getParam(options[k], o, 'templates.fieldsets.fields.options.value_name', /<label[^>]*>[\s\S]*?<\/label>/i, replaceTagsAndSpaces, html_entity_decode);

						getParam(options[k], f, 'templates.fieldsets.fields.extra_id', /<input[^>]+type="text"[^>]*name="([^"]*)/i, null, html_entity_decode);
						getParam(options[k], f, 'templates.fieldsets.fields.extra_value', /<input[^>]+type="text"[^>]*value="([^"]*)/i, null, html_entity_decode);
						getParam(options[k], f, 'templates.fieldsets.fields.extra_comment', /<input[^>]+type="text"[^>]*title="([^"]*)/i, null, html_entity_decode);
					}

					if(AnyBalance.isAvailable('templates.fieldsets.fields.options')){
						if(!f.options) f.options = [];
						f.options.push(o);
					}
				}
			}else if(/<select/i.test(field)){
				getParam(field, f, 'id', /<select[^>]+name="([^"]*)/i, null, html_entity_decode);
				var options = getElements(field, /<option[^>]*>/ig);
				for(var k=0; k<options.length; ++k){
					var o = {};
					getParam(options[k], o, 'templates.fieldsets.fields.options.name', null, replaceTagsAndSpaces, html_entity_decode);
					getParam(options[k], o, 'templates.fieldsets.fields.options.value', /<option[^>]+value="([^"]*)/i, null, html_entity_decode);

					if(/selected/i.test(options[k])){
						getParam(options[k], f, 'templates.fieldsets.fields.options.value_name', null, replaceTagsAndSpaces, html_entity_decode);
						getParam(options[k], f, 'templates.fieldsets.fields.options.value', /<option[^>]+value="([^"]*)/i, null, html_entity_decode);
					}

					if(AnyBalance.isAvailable('templates.fieldsets.fields.options')){
						if(!f.options) f.options = [];
						f.options.push(o);
					}
				}
			}else if(/<input[^>]+type="text"/i.test(field)){
				getParam(field, f, 'templates.fieldsets.fields.id', /<input[^>]+name="([^"]*)/i, null, html_entity_decode);
				getParam(field, f, 'templates.fieldsets.fields.value', /<input[^>]+value="([^"]*)/i, null, html_entity_decode);
				getParam(field, f, 'templates.fieldsets.fields.comment', /<input[^>]+title="([^"]*)/i, null, html_entity_decode);
			}else if(/<textarea/i.test(field)){
				getParam(field, f, 'templates.fieldsets.fields.id', /<textarea[^>]+name="([^"]*)/i, null, html_entity_decode);
				getParam(field, f, 'templates.fieldsets.fields.value', /<textarea[^>]*>([\s\S]*)<\/textarea>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(field, f, 'templates.fieldsets.fields.comment', /<input[^>]+title="([^"]*)/i, null, html_entity_decode);
			}else{
				getParam(field, f, 'templates.fieldsets.fields.value', null, replaceTagsAndSpaces, html_entity_decode);
			}

			fs.fields.push(f);
		}

		if(!checkDescriptiveFieldSet(fs, result)){
			result.fieldsets.push(fs);
		}
		
	}
}

function checkDescriptiveFieldSet(fs, result){
	var len = fs.fields.length;
	if(len && len<= 2){
		var vals = {};
		for(var i=0; i<len; ++i){
			var f = fs.fields[i];
			if(f.id)  //Описательные без ID
				return false;
			if(['Услуга', 'Поставщик'].indexOf(f.name) < 0)
				return false; //Только из этого списка должно быть имя
			vals[f.name] = f.value;
		}

		getParam(vals['Услуга'], result, 'templates.service');
		getParam(vals['Поставщик'], result, 'templates.provider');
		return true;
	}
	return false;
}