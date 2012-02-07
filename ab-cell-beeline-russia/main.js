/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Билайн (Россия).

Сайт оператора: http://beeline.ru/        
Личный кабинет: https://uslugi.beeline.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && !AnyBalance.isAvailable (param))
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

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://uslugi.beeline.ru/"
    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "loginPage.do", {
    	ecareAction: 'login',
      userName: prefs.login,
      password: prefs.password,
      _stateParam: 'eCareLocale.currentLocale=ru_RU__Russian'
    });

    var regexp=/<span class="warn">[\s]*([\s\S]*?)[\s]*<\/span>/, res, tmp;
    if (res=regexp.exec(html)){
        //Ошибка какая-то случилась... Может, пароль неправильный
      	throw new AnyBalance.Error(res[1].replace(/<[^<>]+\/?>/g, ''));
    }

    var corporate = /<title>[^<>]*Управление профилем[^<>]*<\/title>/i.test(html);
    if(!corporate)
        parsePersonal(baseurl, html);
    else
        parseCorporate(baseurl, html);
}

var alltransformations = [/&nbsp;/g, '', /[\s\xA0]/g, "", ",", "."];

function parsePersonal(baseurl, html){
    var result = {success: true};

    AnyBalance.trace("It looks like we are in PERSONAL selfcare...");
    
    // ФИО
    getParam (html, result, 'userName', /Владелец договора[\s\S]*?<td[^>]*>(.*?)</);

    // Состояние номера
    getParam (html, result, 'BlockStatus', /Состояние номера[\s\S]*?<td[^>]*>(.*?)</);

    // Номер договора
    getParam (html, result, 'license', /Номер договора[\s\S]*?<td[^>]*>(.*?)</);
    
    AnyBalance.trace("Fetching finantial info...");

    html = AnyBalance.requestPost(baseurl + "VIPLoadPrepaidCtnFinancialInfoAction.do", '');

    AnyBalance.trace("Parsing finantial info...");

    // Тарифный план
    var tariff = getParam (html, null, null, /Текущий тарифный план[\s\S]*?<td>([\s\S]*?)<\/td>/, [/&nbsp;/g, ' ', /^\s+|\s+$/g, '']);
    if (tariff) {
        var $obj = $(tariff);
        tariff = $obj.text ();
        tariff = tariff.replace (/(^\s+|\s+$)/g, '');
        if (tariff != '')
            result.__tariff = tariff;
    }


    // Баланс
    getParam (html, result, 'balance', /Основной баланс[\s\S]*?'tab(?:text|red)'>([\-\d,\s]+)</, alltransformations, parseFloat);
    
    // Бонус-баланс
    getParam (html, result, 'bonus_balance', /Бонус-баланс[\s\S]*?'tabtext'>([\d,\s]+)</, alltransformations, parseFloat);
    
    if(AnyBalance.isAvailable('sms_left')){
      result.sms_left = 0;
      
      // SMS-баланс
      var sms = getParam(html, null, null, /SMS-баланс[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.sms_left += sms || 0;
      
      // SMS в подарок
      sms = getParam(html, null, null, /SMS в подарок[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.sms_left += sms || 0;
      
      // Бесплатные SMS
      sms = getParam(html, null, null, /Бесплатные SMS[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.sms_left += sms || 0;
    }
    
    // MMS в подарок
    getParam (html, result, 'mms_left', /MMS в подарок[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);

    if(AnyBalance.isAvailable('min_left')){
      result.min_left = 0;
      
      // Бесплатные секунды
      var sms = getParam(html, null, null, /Бесплатные секунды[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.min_left += sms || 0;
      
      // Время в подарок
      sms = getParam(html, null, null, /Время в подарок[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.min_left += sms || 0;
      
      // БОНУС_СЕКУНДЫ
      sms = getParam(html, null, null, /БОНУС_СЕКУНДЫ[\s\S]*?'tabtext'>([\d,]+)</, alltransformations, parseInt);
      result.min_left += sms || 0;
    }

    AnyBalance.setResult(result);
}

function parseBalance(val){
    AnyBalance.trace("Parsing balance: '" + val + "'");
    return parseFloat(val);
}

function parseCorporate(baseurl, html){
    var result = {success: true};

    AnyBalance.trace("It looks like we are in CORPORATE selfcare...");
    
    // ФИО
    getParam (html, result, 'userName', /Название Договора[\s\S]*?<td[^>]*>\s*(.*?)\s*</);

    // Номер договора
    getParam (html, result, 'license', /Номер Договора[\s\S]*?<td[^>]*>\s*(.*?)\s*</);
    
    var phone = AnyBalance.getPreferences().login;
    
    if(AnyBalance.isAvailable('balance')){
        AnyBalance.trace("Fetching balance info...");

        html = AnyBalance.requestPost(baseurl + "navigateMenu.do", {
            _navigation_secondaryMenu:'billing.payment',
            _resetBreadCrumbs:'true'
        });

        // Баланс
        getParam (html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
    }
    
    if(AnyBalance.isAvailable('expences')){
        AnyBalance.trace("Fetching expences info...");
        html = AnyBalance.requestPost(baseurl + "loadUnbilledAction.do", {
		"_navigation_secondaryMenu":'billing.unbilledCalls',
		"_resetBreadCrumbs":'true'
        });

    	var stateParam = getParam(html, null, null, /<form name="ecareSubmitForm"[\s\S]*?name="_stateParam" value="([^"]*)"/i);

        html = AnyBalance.requestPost(baseurl + "VIPUnbilledSubscribersSwitchingAction.do", {
		_stateParam: stateParam,
		_forwardName:'unbilledCharge',
		_resetBreadCrumbs:'null',
		"ctrlvcol%3Dradio%3Bctrl%3DsubscriberListExt%3Btype%3Drd":phone
        });

        // Сколько использовано
        getParam (html, result, 'expences', /Общая сумма начислений[\s\S]*?<td>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
    }
    
    AnyBalance.trace("Fetching number info...");
    
    var stateParam = getParam(html, null, null, /<form name="ecareSubmitForm"[\s\S]*?name="_stateParam" value="([^"]*)"/i);
    
    //К сожалению, телефоны грузятся только после загрузки этой страницы
    html = AnyBalance.requestPost(baseurl + "OnLoadSubscriberProfileFilterAction.do", {
        _stateParam:stateParam,
        _expandStatus:'',
        '_navigation_thirdMenu':'services.profileManagement.subscribers',
        subscriberNumber:phone,
        resetBreadCrumbs:'true'
    });
    
    var rTariff = new RegExp("<td>"+phone+"\\s*</td><td>.*?</td><td>(.*?)</td><td>.*?</td><td>.*?</td><td>(?:.*?)</td>");
    var rStatus = new RegExp("<td>"+phone+"\\s*</td><td>.*?</td><td>(?:.*?)</td><td>.*?</td><td>.*?</td><td>(.*?)</td>");

    // Тарифный план
    result.__tariff = getParam (html, null, null, rTariff, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);

    // Состояние номера
    getParam (html, result, 'BlockStatus', rStatus, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);
    
    var stateParam = getParam(html, null, null, /<form name="ecareSubmitForm"[\s\S]*?name="_stateParam" value="([^"]*)"/i);

    //А теперь давайте получим это более надёжно
    html = AnyBalance.requestPost(baseurl + "SubscriberProfileFilterSwitchingAction.do", {
        _stateParam:stateParam,
        _forwardName:'',
        _resetBreadCrumbs:'',
        _expandStatus:'',
        'status.code':'G',
        subscriberNumber:phone,
        pricePlan:'',
        subscriberListExtExportVar:'',
        ctrla:'subscriberListExt=CellClick=viewLinkStr='+phone+' '
    });

    // Тарифный план
    result.__tariff = getParam (html, null, null, /Название тарифного плана[\s\S]*?<td[^>]*>\s*(?:<a[^>]*>.*?<\/a>)[\s\-]*([\s\S]*?)\s*</, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);

    // Состояние номера
    getParam (html, result, 'BlockStatus', /Статус номера[\s\S]*?<td[^>]*>([\s\S]*?)</, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);

    AnyBalance.setResult(result);
}