function generate_pt() {
    return 'pt_' + Math.random().toString(10).substring(2, 12) + Math.random().toString(10).substring(2, 6) + '.' + Math.random().toString(10).substring(2, 12) + Math.random().toString(10).substring(2, 10);
}
var g_geaders = {
    'accept': 'application/json, text/plain, */*',
    'x-request-origin': 'https://www.privat24.ua',
//    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
'User-Agent': 'Mozilla/5.0 (Linux; Android 7.77; ONEPLUS A3010 Build/OPR6.170623.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Crosswalk/18.48.477.13 Mobile Safari/537.36',
//'User-Agent':'okhttp/3.12.1',
    'origin': 'https://login-widget.privat24.ua',
    'referer': 'https://login-widget.privat24.ua/',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
    'content-type': 'application/json;charset=UTF-8'
}
var xref='';
var apiUrl = 'https://next.privat24.ua/api/p24/';
function site() {
     var prefs = AnyBalance.getPreferences();
     prefs.login = '+380'+(prefs.login.replace(/[^\d]+/g, '').substr(-9));
     if (prefs.cardnum) prefs.cardnum=prefs.cardnum.replace(/[^\d]+/g, '');

xref=AnyBalance.getData('xref'+prefs.login);
var skey=AnyBalance.getData('skey'+prefs.login);
if (!skey) xref='';
if (xref){
	AnyBalance.trace('Найдена старая сессия. Пробуем восстановить');
        //g_geaders.cookie='skey='+skey;
        AnyBalance.setCookie('next.privat24.ua','skey',skey);
        var json = callSiteAPI('refresh',{xref:xref,'_':new Date()*1});
        if (!json.status||json.status!='success'){
        	AnyBalance.trace('Сессия просрочена. Нужна авторизация.');
        	xref='';
        	clearAllCookies();
        }else{
        	AnyBalance.trace('Сессия восстановлена успешно');
        }
}


if (!xref) xref = loginSite(prefs);
if (!xref) throw new AnyBalance.Error('Ошибка авторизации: xref не получен.');
    var json = callSiteAPI('cardslist');
    if (!prefs.cardnum) {
        var card = json[0];
        if (!card||card.length==0) throw AnyBalance.Error('Карты не обнаружены', null, true);
    } else {
        var card = json.filter(function(c) {
            return endsWith(c.number, prefs.cardnum)
        });
        if (!card||card.length==0) {
            var er = 'Карта заканчивающася на ' + prefs.cardnum + ' не найдена';
            AnyBalance.trace(er);
            AnyBalance.trace('Найденные карты:\n'+json.map(function(c) {
                return c.name + '\n' + c.number + '\n'
            }).join('\n'));
            throw new AnyBalance.Error(er, null, true);
        }
        card = card[0];
    }
    var result = {success: true};
    result.balance = parseBalance(card.balance);
    var bonusCard=json.filter(c=> c.product =='BON');
    if (bonusCard.length>0 && card.contract!=bonusCard[0].contract) result.bonusPlus=bonusCard[0].balance;
    AnyBalance.trace(JSON.stringify(card))
    result.card_name = card.name;
    result.card_number = card.number;
    result.__tariff=result.card_name;

    function valut(v) {
        valuts = {
            UAH: 'грн.',
            USD: '$',
            EUR: '€',
            RUB: 'р.'
        }
        return valuts[v] ? valuts[v] : v;
    }

    result.currency = valut(card.currency);
    result.limit = card.limit;
    if (card.limit){
    	if (!prefs.showLimit||prefs.showLimit==2) 
    		result.suflimit=result.currency;
    	else if (prefs.showLimit==0) {
    		result.suflimit=result.currency;
    		result.balance=result.balance-card.limit;
    	}else if (prefs.showLimit==1){
    		result.balance=result.balance-card.limit;
                result.suflimit='+'+card.limit+result.currency;
    	}

    }
    var periods = {
        '0': ' в день',
        '1': ' в неделю',
        '2': ' в месяц'
    }



    var json = callSiteAPI('card/getlimits', {
        action: "getCustomLimits",
        cardId: card.id,
        xref: xref,
        "_": new Date() * 1
    });
    result.html='';
    if(json.cashLimit && json.cashLimit.isLimitSet==true)
    	result.html = 'Лимит на снятие наличных:<br>' + json.cashLimit.usedValue + ' ' + valut(json.currencyCard)+periods[json.cashLimit.period];
    if(json.internetLimit && json.internetLimit.isLimitSet==true)
    	result.html = 'Лимит на расчеты в интернет:<br>' + json.internetLimit.usedValue + ' ' + valut(json.currencyCard)+periods[json.internetLimit.period];

    var json = callSiteAPI('statements?shiftToLast=false&action=getStatements&lang=ru&dateFrom=' + getFormattedDate({
        offsetDay: 10,
        format: 'DD.MM.YYYY'
    }) + '&dateTo=' + getFormattedDate('DD.MM.YYYY') + '&cardId=' + card.id).transactions;
    var res = '';
    if (json){
    for (var i = 0; i < json.length; i++) {
        let s = parseBalance(json[i].amount);
        res += (res ? '<br>' : '')
        res += '<b><strong><font  color=#' + (s < 0 ? 'B00000' : '1e3b24') + '>' + s.toFixed(2) + ' ' + (json[i].restCurrency||json[i].originalAmountCurrency)  + '</font> <font color=#1A5276>' + json[i].dateTime + ':</font></strong></b><br>';
        res += json[i].description ;
        if (json[i].rest) res += '<br><small>Остаток:' + json[i].rest.toFixed(2) + ' ' + json[i].restCurrency + '</small>';
    }
    if (result.html && res) res += '<br><br>'
    }
    result.html = res + result.html;



    //		<counter id="min_pay" name="Минимальный платеж" units=" {@currency}"/>
    //		<counter id="rate" name="Проценты" units="%"/>

    AnyBalance.setResult(result);
}
function callSiteAPI(cmd, params) {
    cmd += (cmd.includes('?') ? '&' : '?') + 'xref=' + xref;
    if (params)
        html = AnyBalance.requestPost(apiUrl + cmd, JSON.stringify(params), g_geaders);
    else
        html = AnyBalance.requestGet(apiUrl + cmd, g_geaders);
//    AnyBalance.trace(cmd +':\n'+html);
    var json=getJson(html);
    if (cmd.includes('refresh')) return json;
    if (json.status=='error' && json.error_code==51) return {error:51};
    if (json.status=='error') throw AnyBalance.Error(json.message,null,true);
    return json.data;
}

function loginSite(prefs) {
	AnyBalance.trace('Начало авторизации');

    if 	(prefs.interval && prefs.begin!=prefs.end){
    	prefs.begin=Number(prefs.begin);
    	prefs.end=Number(prefs.end);
    	var h=new Date().getHours();
    	if ((h>=prefs.begin && h<prefs.end && prefs.begin<prefs.end)||(prefs.begin>prefs.end&&(h>=prefs.begin || h<prefs.end))){
    		AnyBalance.trace('Допустимое время для авторизации');
    	}else{
    		AnyBalance.trace('Авторизация в это время запрещена в настройках');
    		var result = {success: true};
    		setCountersToNull(result);
    		AnyBalance.setResult(result);
    		return;
    	}
    }       
    var pt = generate_pt();
//    var pt ='';
//    var fingerprint = '4400cf9b3c6c42ba17f2497c8c0cfef7-evr42rm9m';
    var fingerprint = '';
    var show_login_phone_form = {
        cmd: "show_login_form",
        fingerprint: fingerprint,
        version: "WEB2",
        lat: null,
        lon: null,
        action: "submit",
        login: prefs.login
    }
    var show_static_password_form = {
        cmd: "show_static_password_form",
        fingerprint: fingerprint,
        lat: null,
        lon: null,
        action: "submit",
        static_password: prefs.password,
        as_legal_person: "false"
    }
var show_sms_password_form={
	cmd: 'show_sms_form',
	fingerprint: fingerprint,
	version: 'WEB2',
	lat: null,
	lon: null,
	action: 'submit',
	sms_incoming_password: '000'
}
//    var url = 'https://www.privat24.ua/http?' + 'lang=ru&fingerprint=' + fingerprint + '&pt=' + pt;
    var url = 'https://www.privat24.ua/http?lang=ru&pt=' + pt;
    for (var i = 0; i < 30; i++) {
        if (i>0) AnyBalance.sleep(1000);
        var html = AnyBalance.requestGet(url, g_geaders);
        var json = getJson(html);
        if (json.data && json.data.step) {
            if (json.data.step.id == 'show_login_phone_form'){
            	if (!show_login_phone_form) continue;
            		AnyBalance.trace('Запрошен логин (номер телефона)');
                	var html = AnyBalance.requestPost(url, JSON.stringify(show_login_phone_form), g_geaders);
                        show_login_phone_form=null;
                        json = getJson(html);
                        if (!json.data || !json.data.step) continue;
                }
            if (json.data.step.id == 'show_static_password_form'){
            	if (!show_static_password_form) continue;
            		AnyBalance.trace('Запрошен пароль');
                	var html = AnyBalance.requestPost(url, JSON.stringify(show_static_password_form), g_geaders);
                        show_static_password_form=null;
                        json = getJson(html);
                        if (!json.data || !json.data.step) continue;
                }
            if (json.data.step.id == 'show_ivr_form'||json.data.step.id == 'show_login_pone_form') {
            	AnyBalance.trace('Звонок от приватбанка. Ждем 40 секунд');
                AnyBalance.sleep(10000);
            	i=0;
                html = AnyBalance.requestGet(url, g_geaders);
                var json = getJson(html);
                if (!json.data || !json.data.step) continue;
            }
/**
            if (json.data.step.id == 'show_ivr_3digits_form') {
            	var code = AnyBalance.retrieveCode('Вам звонит приватбанк на номер '+json.data.phone+'\nВведите последние три цифры номер с которого вам звонили' , null, {time: 60000, inputType: 'number',minLength: 3,maxLength: 3,});
                show_sms_password_form.sms_incoming_password=code;
                var html = AnyBalance.requestPost(url, JSON.stringify(show_sms_password_form), g_geaders);
                json = getJson(html);
                if (!json.data || !json.data.step) continue;
            }
*/
            if (json.data.step.id == 'show_sms_password_form') {
            	if (!show_sms_password_form) continue;
            	AnyBalance.trace('Запрошен код из SMS');
            	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения для входа в личный кабинет, отправленный вам по СМС на номер '+json.data.phone , null, {time: 60000, inputType: 'number',minLength: 3,maxLength: 8,});
                show_sms_password_form.sms_incoming_password=code;
                var html = AnyBalance.requestPost(url, JSON.stringify(show_sms_password_form), g_geaders);
                json = getJson(html);
                if (!json.data || !json.data.step) continue;
            }
            if (json.data.step.id == 'show_channels_form') {
            	AnyBalance.trace('Нужно подтверждение входа в мобильном приложении');
                AnyBalance.sleep(10000);
            	i=0;
                html = AnyBalance.requestGet(url, g_geaders);
                var json = getJson(html);
                if (!json.data || !json.data.step) continue;
            }
            if (json.data.step.id == 'redirect') {
                var dyn_string = json.data.dyn_string;
                var url = json.data.redirect_url;
                var analyticsId = json.data.analyticsId;
            	AnyBalance.trace('Авторизовались успешно');
                break;
            } 
            AnyBalance.trace(html);
            throw new AnyBalance.Error(json.data.step.id + ' - Неизвестный шаг во время авторизаци.',null,true);
        }
    }
        if (!dyn_string) throw AnyBalance.Error('Авторизация не удалась',false,true);
        var html = AnyBalance.requestPost(apiUrl + 'pub/init?dyn_string=' + dyn_string, {
            token: dyn_string,
            "_": new Date() * 1
        }, g_geaders)
        var json = getJson(html);
        if (json.status != 'success') {
            AnyBalance.trace(html);
            throw AnyBalance.Error('Не удалось войти в Приват24',false,true);
        }
        var skey=AnyBalance.getCookie('skey');
        skey=getParam(skey,null,null,/"?([^"]*)"?/);
        clearAllCookies();
        AnyBalance.setCookie('next.privat24.ua','skey',skey);
//        g_geaders.cookie='skey='+skey;
        AnyBalance.setData('skey'+prefs.login,skey);
        AnyBalance.setData('xref'+prefs.login,json.data.xref);
        AnyBalance.saveData();
        return json.data.xref;

    //redirect
    //show_admin_form
    //show_change_password_form
    //show_email_form
    //show_email_password_form
    //show_email_wait_form
    //show_facebook_form
    //show_ivr_3digits_form
    //show_ivr_captcha_form
    //show_ivr_form
    //show_login_form
    //show_pin_form
    //show_sms_form
    //show_social_email_form
    //show_static_password_form
    //unknown
}
