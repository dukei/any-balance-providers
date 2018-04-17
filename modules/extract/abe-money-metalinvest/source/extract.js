/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function encryptPass(pass, map){
	if(map){
		var ch='',i=0,k=0,TempPass='',PassTemplate=map.split(','), Pass='';
		TempPass=pass;
		while(TempPass!=''){
			ch=TempPass.substr(0, 1);
			k = ch.charCodeAt(0);
			if(k>0xFF) k-=0x350;
			if(k==7622) k=185;
			TempPass=TempPass.length>1?TempPass.substr(1, TempPass.length):'';
			if(Pass!='')Pass=Pass+';';
			Pass=Pass+PassTemplate[k];
		}
                return Pass;
	}else{
		return pass;
	}

}

var g_headers = {
    'Accept-Language': 'ru, en',
    BSSHTTPRequest:1,
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

var g_baseurl, g_jsonInfo;

function login(baseurl){
    var prefs = AnyBalance.getPreferences(), jsonInfo;
    g_baseurl = baseurl;

    if(!g_jsonInfo){ 
        var html = AnyBalance.requestGet(baseurl + 'T=RT_2Auth.BF');
        var mapId = getParam(html, null, null, /<input[^>]*name="MapID"[^>]*value="([^"]*)"/i);
        var map = getParam(html, null, null, /var\s+PassTemplate\s*=\s*new\s+Array\s*\(([^\)]*)/i);
        var pass = encryptPass(prefs.password, map);
		
        html = AnyBalance.requestPost(baseurl, {
            tic: 0,
            T:'RT_2Auth.CL',
            A:prefs.login,
            B:pass,
            L:'russian',
            C:'',
            IdCaptcha:'',
            IMode:'',
            sTypeInterface:'default',
            MapID:mapId || ''
        }, g_headers);
		
        var error = getParam(html, null, null, /<BSS_ERROR>\d*\|?([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
        jsonInfo = getJsonObject(html, /ClientInfo=/i);
        if(!jsonInfo){
        	AnyBalance.trace(html);
            throw new AnyBalance.Error("Не удалось найти информацию о сессии в ответе банка.");
        }
		
        html = AnyBalance.requestPost(baseurl, {
            SID:jsonInfo.SID,
            tic:1,
            T:'rt_0clientupdaterest.doheavyupd'
        }, g_headers);
		
        var i=0;
        do{
            AnyBalance.trace('Ожидание обновления данных: ' + (i+1));
            html = AnyBalance.requestPost(baseurl, {
                SID:jsonInfo.SID,
                tic:1,
                T:'rt_0clientupdaterest.CheckForAcyncProcess'
            }, addHeaders({Referer: baseurl+'T=RT_2Auth.BF'}));
        
            var opres = getParam(html, null, null, /^\s*(?:<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>)?([\s\S]*>)?\d+\s*$/i, replaceTagsAndSpaces);
            if(opres){
                AnyBalance.trace('Обновление данных закончено. ' + opres);
                break; //Всё готово, надо получать баланс
            }
            if(++i > 10){  //На всякий случай не делаем больше 10 попыток
                AnyBalance.trace('Не удалось за 10 попыток обновить баланс, получаем старое значение...');
                break;
            }
            AnyBalance.sleep(3000);
        }while(true);

        g_jsonInfo = jsonInfo;
        __setLoginSuccessful();
    }else{
    	AnyBalance.trace('Сессия уже начата, используем её');
    	jsonInfo = g_jsonInfo;
    }
	
	return jsonInfo;
}

function processCredits(jsonInfo, result){
    var html = AnyBalance.requestPost(g_baseurl, {
        WidgetID:'CREDITS',
        Action:'Default',
        Template:'Simple',
        SchemeName:'',
        BlockName:''
    }, addHeaders({
    	BSSHTTPRequest: '1',
    	'X-Requested-With': 'XMLHttpRequest',
    	BSSHTTPRequestExt: '1',
    	'RTS-Request': 'SID=' + jsonInfo.SID + '&T=bss_plugins_core.widget&tic=1&isNewCore=1', 
    	Referer: g_baseurl
    }));

    var cnt = getParam(html, /Всего\s*<strong[^>]*>([\s\S]*?)<\/strong>\s*кредит/i, replaceTagsAndSpaces, parseBalance);
    if(!cnt){
    	AnyBalance.trace('Похоже, кредитов нет...\n' + (isset(cnt) ? '' : html));
    	return;
    }

    AnyBalance.trace('Заявлено ' + cnt + ' кредитов');

    var divs = getElements(html, /<div[^>]+credit-item/ig);
    result.credits = [];

    AnyBalance.trace('Найдено ' + divs.length + ' кредитов');

    for(var i=0; i<divs.length; ++i){
    	var row = divs[i];
    	var num = getParam(row, /getFormNickName\s*\([^),],\s*'([^']*)/i, replaceHtmlEntities);
    	var name = getElement(row, /<div[^>]+credit_name/i, replaceTagsAndSpaces);
    	var c = {__id: num, __name: name, num: num};
    	if(__shouldProcess('credits', c)){
    		processCredit(jsonInfo, row, c);
    	}

    	result.credits.push(c);
    }
}

function processAccounts(jsonInfo, result){
    var html = AnyBalance.requestPost(g_baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'STM',
        XACTION: 'NEW'
    }, addHeaders({Referer: g_baseurl}));

    var tbl = getElement(html, /<table[^>]+id="SCROLLER"[^>]*>/i);
    if(!tbl){
    	AnyBalance.trace('Похоже, счетов нет...\n' + html);
    	return;
    }

    var headbody = getElements(tbl, /<(?:thead|tbody)[^>]*>/ig);
    if(!/<thead/i.test('' + headbody[0])){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удаётся найти заголовок таблицы счетов. Сайт изменен?');
    }
    if(!/<tbody/i.test('' + headbody[1])){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удаётся найти тело таблицы счетов. Сайт изменен?');
    }

    result.accounts = [];

    var cols = getColsAccount(headbody[0]);
    var trs = getElements(headbody[1], /<tr[^>]*>/ig);
    for(var i=0; i<trs.length; ++i){
    	var row = trs[i];
    	var tds = getElements(row, /<td[^>]*>/ig);
    	var id = getParam(row, null, null, /<input[^>]+type="checkbox"[^>]*STM="([^"]*)/i, replaceHtmlEntities);
    	var name = getParam(tds[cols.name], null, null, null, replaceTagsAndSpaces);
    	var c = {__id: id, __name: name, num: id};
    	if(__shouldProcess('accounts', c)){
    		processAccount(cols, tds, c);
			processAccountTransactions(jsonInfo, c);
    	}

    	result.accounts.push(c);
    }
}

function getColsAccount(thead){
    var cols = {};
    var ths = getElements(thead, /<th\b[^>]*>/ig);
    for(var i=0; i<ths.length; ++i){
    	var name = getParam(ths[i], null, null, null, replaceTagsAndSpaces);
    	if(/Название счета/i.test(name))
    		cols.name = i;
    	else if(/Сч[её]т/i.test(name))
    		cols.num = i;
    	else if(/Остаток/i.test(name))
    		cols.balance = i;
    	else if(/Валюта/i.test(name))
    		cols.currency = i;
    }
    return cols;
}

function processInfo(jsonInfo, result){
	if(!result.info)
		result.info = {};
	getParam(jsonInfo.USR, result.info, 'info.fio');
}

function processAccount(cols, tds, c){
	if(isset(cols.currency))
		getParam(tds[cols.currency], c, ['accounts.currency', 'accounts.balance'], null, replaceTagsAndSpaces);
	if(isset(cols.balance))
		getParam(tds[cols.balance], c, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(c.__id, c, 'accounts.num', /^\d+/);
	if(isset(cols.name))
		getParam(tds[cols.name], c, 'accounts.name', null, replaceTagsAndSpaces);
}

function processCredit(jsonInfo, row, c){
	getParam(row, c, 'credits.limit', /Первоначальная сумма кредита:[\s\S]*?<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(row, c, 'credits.balance', /<div[^>]+"sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(row, c, ['credits.currency', 'credits.limit', 'credits.balance', 'credits.min_pay'], /<div[^>]+"sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(row, c, 'credits.date_end', /Дата окончательных расчетов по кредиту:[\s\S]*?<\/li>/i, replaceTagsAndSpaces, parseDate);
	getParam(row, c, 'credits.min_pay_till', /Ближайший платеж:([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
	getParam(row, c, 'credits.min_pay', /на сумму([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	processCreditExtra(jsonInfo, row, c);
}

function processCreditExtra(jsonInfo, row, c){
	if(AnyBalance.isAvailable('credits.type', 'credits.agreement', 'credits.agreement_date', 'credits.date_start', 'credits.min_pay_till',
		'credits.peni','credits.min_early','credits.min_pay_debt','credits.min_pay_pct','credits.min_pay_pct_due','credits.min_pay_debt_due','credits.pct_due','credits.peni_debt',
		'credits.peni_pct','credits.other_payments', 'credits.min_pay', 'credits.pct', 'credits.tranzactions', 'credits.schedule')){

		var idr = getParam(row, /IDR:([0-9a-f\-]+)/i);
		if(!idr){
			AnyBalance.trace(row);
			throw new AnyBalance.Error('Не удалось найти ссылку на расширенную информацию по кредиту. Сайт изменен?');
		}

        var html = AnyBalance.requestPost(g_baseurl, {
            WidgetID:'CREDITS',
            Action:'CreditInfoData',
            Template:'info',
            IDR: idr,
            SchemeName:'',
            BlockName:''
        }, addHeaders({
        	BSSHTTPRequest: '1',
        	'X-Requested-With': 'XMLHttpRequest',
        	BSSHTTPRequestExt: '1',
        	'RTS-Request': 'SID=' + jsonInfo.SID + '&T=bss_plugins_core.widget&tic=1&isNewCore=1', 
        	Referer: g_baseurl
        }));
        
        getParam(html, c, 'credits.type', />\s*Тип кредита[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, c, 'credits.agreement', />\s*Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, c, 'credits.agreement_date', />\s*Дата договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
        getParam(html, c, 'credits.date_start', />\s*Дата выдачи[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, c, 'credits.pct', />\s*Расчетная процентная ставка[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

        getParam(html, c, 'credits.pct_sum', />\s*Сумма начисленных процентов:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.debt', />\s*Сумма просроченной задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.pct_debt', />\s*Процентная ставка на просроченную задолженность[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.period', />\s*Периодичность платежей[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

        getParam(html, c, 'credits.min_pay_pct_due', />\s*Сумма начисленных процентов по просроченной задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.min_pay_pct', />\s*Сумма срочных процентов к уплате[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.pct_due', />\s*Сумма просроченных процентов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

        //Сумма неустойки/пени за просроченную задолженность
        getParam(html, c, 'credits.peni', />\s*Сумма неустойки[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.min_early', />\s*Минимальная сумма досрочного погашения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.min_pay_debt', />\s*Сумма погашения срочного основного долга по кредиту[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.min_pay_debt_due', />\s*Сумма погашения просроченного долга по кредиту[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.peni_debt', />\s*Неустойка за основной долг[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.peni_pct', />\s*Неустойка за проценты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, c, 'credits.other_payments', />\s*Иные платежи[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

        if(AnyBalance.isAvailable('credits.transactions')){
        	processCreditTransactions(html, c);
        }
        if(AnyBalance.isAvailable('credits.schedule')){
        	processCreditSchedule(html, c);
        }
    }
}

function getColsAccountTransactions(thead){
    var cols = {};
    var ths = getElements(thead, /<th\b[^>]*>/ig);
    for(var i=0; i<ths.length; ++i){
    	var name = getParam(ths[i], null, null, null, replaceTagsAndSpaces);
    	if(/Дата/i.test(name))
    		cols.date = i;
    	else if(/Номер операции/i.test(name))
    		cols.opnum = i;
    	else if(/Сумма/i.test(name))
    		cols.sum = i;
    	else if(/Корреспондирующий счет/i.test(name))
    		cols.corrnum = i;
    	else if(/Наименование корреспондента/i.test(name))
    		cols.corrname = i;
    	else if(/Назначение платежа/i.test(name))
    		cols.descr = i;
    }
    return cols;
}


function processAccountTransactions(jsonInfo, c){
	if(AnyBalance.isAvailable('accounts.transactions')){
		var dt = new Date();
		var dtFrom = new Date(dt.getFullYear()-1, dt.getMonth(), dt.getDate()+1);

		do{
            var html = AnyBalance.requestPost(g_baseurl, {
                SID:jsonInfo.SID,
                tic:1,
                BDate: dtFrom.getFullYear() + '-' + n2(dtFrom.getMonth()+1) + '-' + n2(dtFrom.getDate()),
                EDate: dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()),
                T:'RT_2IC.view',
                Accounts: c.__id,
                CUSTOMVIEW:1,
                PERIOD: 3,
                SCHEMENAME:'STM',
				FORMACTION:'view',
				PulfAccess:'',
				ShowStatRecDoc:'0',
            }, addHeaders({Referer: g_baseurl}));
            
            var tbl = getElement(html, /<table[^>]+id="SCROLLER"[^>]*>/i);
            if(!tbl){
            	//Ограничение на частоту запроса выписок
            	var err = getParam(html, null, null, /<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces);
            	if(err){
            		AnyBalance.trace('Не получили транзакции с ошибкой: ' + err);
            		var secs = getParam(err, null, null, /Выписка будет доступна через\s*(\d+)\s*сек/i, null, parseBalance);
            		if(secs){
            			AnyBalance.trace('Ждем ' + secs + ' сек...');
            			AnyBalance.sleep(secs*1000);
            			continue; //И пробуем ещё раз
            		}
            	}
            	
            }

            if(!tbl){
            	AnyBalance.trace('Похоже, транзакций по счету ' + c.__id + ' нет...\n' + html);
            	return;
            }

            break;
        }while(true);
        
        var headbody = getElements(tbl, /<(?:thead|tbody)[^>]*>/ig);
        if(!/<thead/i.test('' + headbody[0])){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удаётся найти заголовок таблицы транзакций счета. Сайт изменен?');
        }
        if(!/<tbody/i.test('' + headbody[1])){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удаётся найти тело таблицы транзакций счета. Сайт изменен?');
        }

        c.transactions = [];

        var cols = getColsAccountTransactions(headbody[0]);
        var trs = getElements(headbody[1], /<tr[^>]*>/ig);
        for(var i=0; i<trs.length; ++i){
        	var row = trs[i];
        	if(/colspan/i.test(row))
        		continue; //Агрегированная информация, пропускаем
        	var tds = getElements(row, /<td[^>]*>/ig);
        	var t = {};

			if(isset(cols.date)) 
				getParam(tds[cols.date], t, 'accounts.transactions.date', null, replaceTagsAndSpaces, parseDate);
			if(isset(cols.sum))
				getParam(tds[cols.sum], t, 'accounts.transactions.sum', null, replaceTagsAndSpaces, parseBalance);
			if(isset(cols.opnum))
				getParam(tds[cols.opnum], t, 'credits.transactions.opnum', null, replaceTagsAndSpaces);
			if(isset(cols.corrnum))
				getParam(tds[cols.corrnum], t, 'credits.transactions.corrnum', null, replaceTagsAndSpaces);
			if(isset(cols.corrname))
				getParam(tds[cols.corrname], t, 'credits.transactions.corrname', null, replaceTagsAndSpaces);
			if(isset(cols.descr))
				getParam(tds[cols.descr], t, 'credits.transactions.descr', null, replaceTagsAndSpaces);
        
        	c.transactions.push(t);
        }
    }
}
