/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Билайн (Россия).

Сайт оператора: http://beeline.ru/        
Личный кабинет: https://uslugi.beeline.ru/
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

var replaceTagsAndSpaces = [/<!--[\s\S]*?-->/g, '', /&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurls = {
      ru: "https://uslugi.beeline.ru/",
      kz: "https://uslugi.beeline.kz/",
      uz: "https://uslugi.beeline.uz/"
    }

    if(!prefs.country || !baseurls[prefs.country]){
      AnyBalance.trace("Unknown country: " + prefs.country + ", defaulting to ru");
      prefs.country = 'ru';
    }

    if(prefs.phone && !/\d{10}/.test(prefs.phone))
	throw new AnyBalance.Error('Прикрепленный номер должен содержать 10 цифр или быть пустым, если вы хотите получить информацию по номеру логина');

    var baseurl = baseurls[prefs.country];

    var headers = {
        Accept:	'text/html, application/xhtml+xml, */*',
        Referer: 'https://uslugi.beeline.ru/vip/loginPage.jsp',
        'Accept-Language': 'ru-RU',
	 //Internet Explorer пускает охотнее, как ни странно.
        'User-Agent':	'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
        'Connection':	'Keep-Alive',
        'Cache-Control': 'no-cache'
    };

    var html = AnyBalance.requestGet(baseurl, headers); //Хз, помогает, или нет. Но куку какую-то она ставит. Пусть будет.

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "loginPage.do", {
    	ecareAction: 'login',
      userName: prefs.login,
      password: prefs.password,
      _stateParam: 'eCareLocale.currentLocale=ru_RU__Russian'
    }, headers);

    var regexp=/<span class="warn">[\s]*([\s\S]*?)[\s]*<\/span>/, res, tmp;
    if (res=regexp.exec(html)){
        //Ошибка какая-то случилась... Может, пароль неправильный
      	throw new AnyBalance.Error(res[1].replace(/<[^<>]+\/?>/g, ''));
    }

    if (getParam(html, null, null, /("EcareLoginForm")/i))
        //Ошибка какая-то случилась... Билайн глючит. Надо попробовать ещё раз зайти.
      	throw new AnyBalance.Error('Билайн не пускает в кабинет даже без сообщения ошибки. Возможно, проблемы на сайте.', true);
    
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
    
    // Тарифный план
    getParam (html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.trace("Fetching finantial info...");

    html = AnyBalance.requestPost(baseurl + "VIPLoadPrepaidCtnFinancialInfoAction.do", '');

    AnyBalance.trace("Parsing finantial info...");

    // Тарифный план
//    getParam (html, result, '__tariff', /Текущий тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    
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

function getBalanceValueExpirationDate(html, text, parseFunc, result, counter){
    var regexp = new RegExp(text + '[\\s\\S]*?<td[\\s\\S]*?<td[\\s\\S]*?<td[^>]*>([^<]+)<', 'i');
    return getParam(html, result, counter, regexp, alltransformations, parseDate);
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
    
    // Бонус за опрос
    getBalanceValue (html, 'Бонус за опрос', parseFloat, result, 'bonus_survey');
    
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
	
	if(AnyBalance.isAvailable('sms_expiration')){
	  result.sms_expiration = getBalanceValueExpirationDate (html, 'SMS-баланс');  
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

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time = 0;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + 'from value: ' +  str);
    return time;
}

//Билайн показывает старый расчетый период.
//Надо сделать новый, это ближайшее прошедшее число месяца
function parsePeriod(str){
    var time = parseDate(str);
    if(!time)
      return 0;

    var now = new Date();
    var endDay = new Date(time).getDate(); //Число конца прошлого периода
    var startDate = new Date(time + 86400*1000); //Число начала текущего периода
    var day = startDate.getDate();
    var curStart = new Date(now.getFullYear(), now.getMonth(), day);
    //Если перешли через границу месяца, то надо на первое число сбросить
    if(curStart.getDate() < endDay) surStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if(curStart > now) //Если перепрыгнули текущую дату, откатываемся на месяц назад
        curStart = new Date(now.getFullYear(), now.getMonth()-1, day);
    //Если снова перешли через границу месяца, то надо на первое число сбросить
    if(curStart.getDate() < endDay) surStart = new Date(now.getFullYear(), now.getMonth(), day);

    AnyBalance.trace("Computing period start from last period end: " + curStart + ' from ' + str);
    return curStart.getTime();
}

function getStateParam(html){
   return getParam(html, null, null, /<form name="ecareSubmitForm"[\s\S]*?name="_stateParam" value="([^"]*)"/i);
}

function getPhone(html){
    return getParam(html, null, null, /<input[^>]*name=["']subscriberNumber["'][^>]*value=["']([^'"]*)["']/i) ||
    	getParam(html, null, null, /subscriberListExt=CellClick=viewLinkStr=(\d+)/i);
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

    AnyBalance.trace("Fetching number info...");
    
    var stateParam = getStateParam(html);
    
    //Меню "пользователи"
    html = AnyBalance.requestPost(baseurl + "OnLoadSubscriberProfileFilterAction.do", {
        _stateParam:stateParam,
        _expandStatus:'',
        '_navigation_thirdMenu':'services.profileManagement.subscribers',
        resetBreadCrumbs:'true'
    });

    var phone = AnyBalance.getPreferences().phone || getPhone(html) || AnyBalance.getPreferences().login;
    
    var rTariff = new RegExp("<td>"+phone+"\\s*</td><td>.*?</td><td>(.*?)</td><td>.*?</td><td>.*?</td><td>(?:.*?)</td>");
    var rStatus = new RegExp("<td>"+phone+"\\s*</td><td>.*?</td><td>(?:.*?)</td><td>.*?</td><td>.*?</td><td>(.*?)</td>");

    // Тарифный план
    getParam (html, result, '__tariff', rTariff, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, ''], html_entity_decode);

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
    getParam (html, result, '__tariff', /Название тарифного плана[\s\S]*?<td[^>]*>\s*(?:<a[^>]*>.*?<\/a>)[\s\-]*([\s\S]*?)\s*</, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, ''], html_entity_decode);

    // Состояние номера
    getParam (html, result, 'BlockStatus', /Статус номера[\s\S]*?<td[^>]*>([\s\S]*?)</, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);
    
    if(/'prePaid(?:Ctn)?Balances?List'/i.test(html)){
      AnyBalance.trace("Balance list found!");
      parseBalanceList(html, result); //в корпоративных предоплаченных тарифных планах похоже на персональные
    }else{
      AnyBalance.trace("Balance list not found, is it credit tariff plan?");
    }

    //Ссылка на финансовую информацию, похоже, только в кредитных корпоративных тарифных планах
    if(/'_navigation_primaryMenu=billing'/.test(html)){
      AnyBalance.trace("Found financial info link, trying to fetch balance and expences");

      if(AnyBalance.isAvailable('balance', 'period_begin')){
        AnyBalance.trace("Fetching balance and period info...");

        // Финансовая информация - платежи
        html = AnyBalance.requestPost(baseurl + "navigateMenu.do", {
          _stateParam: getStateParam(html),
          _navigation_secondaryMenu:'billing.payment',
          _resetBreadCrumbs:'true'
        });

        // Баланс
        getParam (html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
        // Начало расчетного периода
        getParam (html, result, 'period_begin', /<select[^>]*name="dateList\.code"[^>]*>\s*<option[^>]*>([^<]*)/i, null, parsePeriod);
      }

      if(AnyBalance.isAvailable('expences','expencesTraffic','expencesAbon','expencesInstant')){
        AnyBalance.trace("Fetching current period calls...");
        // Финансовая информация - звонки текущего периода
        html = AnyBalance.requestPost(baseurl + "loadUnbilledAction.do", {
          _stateParam: getStateParam(html),
          "_navigation_secondaryMenu":'billing.unbilledCalls',
          "_resetBreadCrumbs":'true'
        });

        for(var i=0; i<3; i++){
        // Финансовая информация - звонки текущего периода - Начисления
        var stateParam = getStateParam(html);
            AnyBalance.trace("Fetching expences info (" + (i+1) + "/3)...");
            html = AnyBalance.requestPost(baseurl + "VIPUnbilledSubscribersSwitchingAction.do", {
              _stateParam: stateParam,
              _forwardName:'unbilledCharge',
              _resetBreadCrumbs:'null',
              "ctrlvcol%3Dradio%3Bctrl%3DsubscriberListExt%3Btype%3Drd":phone
            });

            var error = getParam(html, null, null, /<LI[^>]*class="errorMessage"[^>]*>([\S\s]*?)<\/LI>/i, replaceTagsAndSpaces, html_entity_decode);
            // Тут иногда выдаёт <LI class="errorMessage">Обслуживание в настоящее время невозможно. Повторите, пожалуйста, запрос позже.</LI>
            if(!error)
                break;
            AnyBalance.trace("Ошибка получения расходов: " + error)
        }
        
        // Сколько использовано
        getParam (html, result, 'expences', /Общая сумма начислений[\s\S]*?<td>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
        getParam (html, result, 'expencesTraffic', /Начисления за трафик[\s\S]*?<td>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
        getParam (html, result, 'expencesAbon', /Абонентская плата[\s\S]*?<td>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
        getParam (html, result, 'expencesInstant', /Разовые начисления[\s\S]*?<td>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);

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
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}
