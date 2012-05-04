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
    var baseurls = {
      ru: "https://uslugi.beeline.ru/",
      uz: "https://uslugi.beeline.uz/"
    }

    if(!prefs.country || !baseurls[prefs.country]){
      AnyBalance.trace("Unknown country: " + prefs.country + ", defaulting to ru");
      prefs.country = 'ru';
    }

    if(prefs.phone && !/\d{10}/.test(prefs.phone))
	throw new AnyBalance.Error('Прикрепленный номер должен содержать 10 цифр или быть пустым, если вы хотите получить информацию по номеру логина');

    var baseurl = baseurls[prefs.country];

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

//Преобразование в число
var alltransformations = [/&nbsp;/g, '', /[\s\xA0]/g, "", ",", ".", /[^\d\-\.]+/g, ''];

function parsePersonal(baseurl, html){
    var result = {success: true};

    if(AnyBalance.isAvailable('balance')){
      result.balance = null; //Баланс должен быть всегда, даже если его не удаётся получить. 
      //Если его не удалось получить, то передаём null, чтобы значение взялось из предыдущего запроса
    }

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
            result.__tariff = html_entity_decode(tariff);
    }
    
    parseBalanceList(html, result);

    AnyBalance.setResult(result);
}

function parseBalance(val){
    AnyBalance.trace("Parsing money value: '" + val + "'");
    return parseFloat(val);
}

function getBalanceValue(html, text, parseFunc, result, counter){
    var regexp = new RegExp(text + '[\\s\\S]*?<td[\\s\\S]*?<td[^>]*>([^<]+)<', 'i');
    return getParam(html, result, counter, regexp, alltransformations, parseFunc);
}

function parseBalanceList(html, result){
    //Уменьшим область поиска для скорости и (надеюсь) для надежности
    html = getParam(html, null, null, /'prePaid(?:Ctn)?Balances?List'([\s\S]*?)'prePaid(?:Ctn)?Balances?List'/i);

    // Баланс
    getBalanceValue (html, 'Основной баланс', parseBalance, result, 'balance');
    
    // Бонус-баланс
    if(AnyBalance.isAvailable('bonus_balance')){
      result.bonus_balance = 0;

      var val = getBalanceValue (html, 'Бонус-баланс', parseFloat);
      result.bonus_balance += val || 0;

      //Узбекистан
      val = getBalanceValue (html, 'BEE_CLUB', parseFloat);
      result.bonus_balance += val || 0;
    }
    
    if(AnyBalance.isAvailable('sms_left')){
      result.sms_left = 0;
      
      // SMS-баланс
      var sms = getBalanceValue (html, 'SMS-баланс', parseInt);
      result.sms_left += sms || 0;                                                         
      
      // SMS в подарок
      sms = getBalanceValue (html, 'SMS в подарок', parseInt);
      result.sms_left += sms || 0;
      
      // Бесплатные SMS
      sms = getBalanceValue (html, 'Бесплатные SMS', parseInt);
      result.sms_left += sms || 0;
      
      // SMS Бонус  //Узбекистан
      sms = getBalanceValue (html, 'SMS Бонус', parseInt);
      result.sms_left += sms || 0;
      
      // Баланс SMS  //Узбекистан
      sms = getBalanceValue (html, 'Баланс SMS', parseInt);
      result.sms_left += sms || 0;
      
      // Пакет МН SMS  //Узбекистан
      sms = getBalanceValue (html, 'Пакет МН SMS', parseInt);
      result.sms_left += sms || 0;
      
      // Дополнительный SMS баланс  //Узбекистан
      sms = getBalanceValue (html, 'Дополнительный SMS баланс', parseInt);
      result.sms_left += sms || 0;
    }
    
    // MMS в подарок
    getBalanceValue (html, 'MMS в подарок', parseInt, result, 'mms_left');

    if(AnyBalance.isAvailable('min_left')){
      result.min_left = 0;
      
      // Бесплатные секунды
      var sms = getBalanceValue (html, 'Бесплатные секунды', parseInt);
      result.min_left += sms || 0;
      
      // Время в подарок
      sms = getBalanceValue (html, 'Время в подарок', parseInt);
      result.min_left += sms || 0;
      
      // БОНУС_СЕКУНДЫ
      sms = getBalanceValue (html, 'БОНУС_СЕКУНДЫ', parseInt);
      result.min_left += sms || 0;
      
      // Бонус секунды //Узбекистан
      sms = getBalanceValue (html, 'БОНУС_СЕКУНДЫ', parseInt);
      result.min_left += sms || 0;

      // Час в подарок //Узбекистан
      sms = getBalanceValue (html, 'Час в подарок', parseInt);
      result.min_left += sms || 0;

      // Баланс исходящих минут //Узбекистан
      sms = getBalanceValue (html, 'Баланс исходящих минут', parseInt);
      result.min_left += sms || 0;
    }
}

function parseMinutes(str){
    AnyBalance.trace('Parsing minutes from value: ' + str);
    return parseFloat(str)*60; //Переводим в секунды
}

function getStateParam(html){
   return getParam(html, null, null, /<form name="ecareSubmitForm"[\s\S]*?name="_stateParam" value="([^"]*)"/i);
}

function parseCorporate(baseurl, html){
    var result = {success: true};

    if(AnyBalance.isAvailable('balance')){
      result.balance = null; //Баланс должен быть всегда, даже если его не удаётся получить. 
      //Если его не удалось получить, то передаём null, чтобы значение взялось из предыдущего запроса
    }

    AnyBalance.trace("It looks like we are in CORPORATE selfcare...");
    
    // ФИО
    getParam (html, result, 'userName', /Название Договора[\s\S]*?<td[^>]*>\s*(.*?)\s*</, null, html_entity_decode);

    // Номер договора
    getParam (html, result, 'license', /Номер Договора[\s\S]*?<td[^>]*>\s*(.*?)\s*</, null, html_entity_decode);
    
    var phone = AnyBalance.getPreferences().phone || AnyBalance.getPreferences().login;
    
    //Ссылка на финансовую информацию, похоже, только в кредитных корпоративных тарифных планах
    if(/'_navigation_primaryMenu=billing'/.test(html)){
      AnyBalance.trace("Found financial info link, trying to fetch balance and expences");

      if(AnyBalance.isAvailable('balance')){
        AnyBalance.trace("Fetching balance info...");

        // Финансовая информация - платежи
        html = AnyBalance.requestPost(baseurl + "navigateMenu.do", {
          _navigation_secondaryMenu:'billing.payment',
          _resetBreadCrumbs:'true'
        });

        // Баланс
        getParam (html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
      }

      if(AnyBalance.isAvailable('expences')){
        AnyBalance.trace("Fetching current period calls...");
        // Финансовая информация - звонки текущего периода
        html = AnyBalance.requestPost(baseurl + "loadUnbilledAction.do", {
          "_navigation_secondaryMenu":'billing.unbilledCalls',
          "_resetBreadCrumbs":'true'
        });

        // Финансовая информация - звонки текущего периода - Начисления
        var stateParam = getStateParam(html);
        AnyBalance.trace("Fetching expences info...");
        html = AnyBalance.requestPost(baseurl + "VIPUnbilledSubscribersSwitchingAction.do", {
          _stateParam: stateParam,
          _forwardName:'unbilledCharge',
          _resetBreadCrumbs:'null',
          "ctrlvcol%3Dradio%3Bctrl%3DsubscriberListExt%3Btype%3Drd":phone
        });
        
        // Сколько использовано
        getParam (html, result, 'expences', /Общая сумма начислений[\s\S]*?<td>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
      }

      if(AnyBalance.isAvailable('sms_left', 'min_left')){
        AnyBalance.trace("Fetching inclusive info...");
        // Финансовая информация - звонки текущего периода - включенные минуты
        html = AnyBalance.requestPost(baseurl + "loadUnbilledAction.do", {
          "_navigation_secondaryMenu":'billing.unbilledCalls',
          "_resetBreadCrumbs":'true'
        });

        
      // Финансовая информация - звонки текущего периода - включенные минуты
        var stateParam = getStateParam(html);
        html = AnyBalance.requestPost(baseurl + "VIPUnbilledSubscribersSwitchingAction.do", {
          _stateParam: stateParam,
          _forwardName:'unusedInclusive',
          _resetBreadCrumbs:'null',
          "ctrlvcol%3Dradio%3Bctrl%3DsubscriberListExt%3Btype%3Drd":phone
        });
        
        // Сколько использовано минут
        //<td>Всё включено L (фед.)         </td><td>26.02.2012</td><td>10.03.2012</td><td>252,00</td><td>мин.</td>
        getParam (html, result, 'min_left', /<td>(-?\d[^<]*)<\/td><td>мин[^<]*<\/td>/i, [/\s+/g, '', /,/g, '.'], parseMinutes);
        // Сколько использовано смс
        //<td>(0/0) СМС (прием/передача)    </td><td>26.02.2012</td><td>10.03.2012</td><td>2 984,00</td><td>шт.</td>
        //Странно /(-\d[\d\.,\s]*) не матчит число с пробелом в андроиде. Точнее, матчит только 2. Что за хрень такая?
        getParam (html, result, 'sms_left', /<td>[^<]*(?:СМС|SMS)(?:[^<]*<\/td><td>){3}(-?\d[^<]*)/i, [/\s+/g, '', /,/g, '.'], parseFloat);
      }
    }
    
    AnyBalance.trace("Fetching number info...");
    
    var stateParam = getStateParam(html);
    
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
    result.__tariff = getParam (html, null, null, rTariff, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, ''], html_entity_decode);

    // Состояние номера
    getParam (html, result, 'BlockStatus', rStatus, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);
    
    var stateParam = getStateParam(html);

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
    result.__tariff = getParam (html, null, null, /Название тарифного плана[\s\S]*?<td[^>]*>\s*(?:<a[^>]*>.*?<\/a>)[\s\-]*([\s\S]*?)\s*</, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, ''], html_entity_decode);

    // Состояние номера
    getParam (html, result, 'BlockStatus', /Статус номера[\s\S]*?<td[^>]*>([\s\S]*?)</, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);
    
    if(/'prePaid(?:Ctn)?Balances?List'/i.test(html)){
      AnyBalance.trace("Balance list found!");
      parseBalanceList(html, result); //в корпоративных предоплаченных тарифных планах похоже на персональные
    }else{
      AnyBalance.trace("Balance list not found, is it credit tariff plan?");
    }

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}
