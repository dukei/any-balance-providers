/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у на лицевом счете корпоративного тарифа сотового оператора МТС. Вход через корпоративный личный кабинет.

Сайт оператора: http://mts.ru/
Личный кабинет: https://ip.mts.ru/SELFCAREPDA/
*/
var regions = {
	auto: "https://ihelper.mts.ru/corpselfcare/", 
	center: "https://ihelper.mts.ru/corpselfcare/",
	primorye: "https://ihelper.primorye.mts.ru/SelfCareCorporate/",
	nnov: "https://ihelper.nnov.mts.ru/selfcarecorporate/",
	nw: "https://ihelper.nw.mts.ru/CorpSelfCare/",
	sib: "https://ihelper.sib.mts.ru/corpselfcare/",
	ural: "https://ihelper.nnov.mts.ru/selfcarecorporate/", //Почему-то урал в конце концов переадресуется сюда
	ug: "https://ihelper.ug.mts.ru/CorpSelfCare/"
};

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
        if(result && param)
            return result[param] = value;
        else
            return value;
	}
}

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(!regions[prefs.region]){
	AnyBalance.trace("Unknown region: " + prefs.region + ", setting to auto");
        prefs.region = 'auto';
    }

    var baseurl = regions[prefs.region],
        viewstate, eventval, matches, enterButton;

    var html = AnyBalance.requestGet(baseurl + "logon.aspx");
    viewstate = getViewState(html);
    enterButton = getParam(html, null, null, /name="ctl00\$MainContent\$btnEnter".*?value="([^"]*)"/);
    
    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    html = AnyBalance.requestPost(baseurl + "logon.aspx", {
        __VIEWSTATE: viewstate,
        "ctl00$MainContent$tbPhoneNumber":prefs.login,
        "ctl00$MainContent$tbPassword":prefs.password,
        "ctl00$MainContent$btnEnter": enterButton
    });
    
    //Проверим, не заредиректили ли нас
    var regexp=/<form .*?id="redirect-form".*?action="[^"]*\.([^\.]+)\.mts\.ru/, res, tmp;
    if (res=regexp.exec(html)){
        //Неправильный регион. Умный мтс нас редиректит
        //Только эта скотина не всегда даёт правильную ссылку, иногда даёт такую, которая требует ещё редиректов
        //Поэтому приходится вычленять из ссылки непосредственно нужный регион
        if(!regions[res[1]])
                throw new AnyBalance.Error("mts has redirected to unknown region: " + res[1]);

        baseurl = regions[res[1]];
        AnyBalance.trace("Redirected, now trying to enter selfcare at address: " + baseurl);

        html = AnyBalance.requestGet(baseurl + "logon.aspx");
        viewstate = getViewState(html);
        enterButton = getParam(html, null, null, /name="ctl00\$MainContent\$btnEnter".*?value="([^"]*)"/);

        html = AnyBalance.requestPost(baseurl + "logon.aspx", {
            __VIEWSTATE: viewstate,
            "ctl00$MainContent$tbPhoneNumber":prefs.login,
            "ctl00$MainContent$tbPassword":prefs.password,
            "ctl00$MainContent$btnEnter": enterButton
        });
    }

    //Проверим, залогинились ли
    if(matches = /<div class="b_error">([\s\S]*?)<\/div>/.exec(html))
        throw new AnyBalance.Error(matches[1].replace(/<[^>]*>/g, ''));
    
    html = AnyBalance.requestGet(baseurl + 'pa-management.aspx');

    //Проверим, получили ли инфу по счету
    if(matches = /<div class="b_error">([\s\S]*?)<\/div>/.exec(html))
        throw new AnyBalance.Error(matches[1].replace(/<[^>]*>/g, ''));

    viewstate = getViewState(html);
    eventval = getEventValidation(html);
    
    var licschet = prefs.licschet;
    if(!licschet){
        licschet = getParam(html, null, null, /Лицевой счет:[^\d]*(\d*)/);
        AnyBalance.trace('Tried to find personal account automatically: ' + licschet);
    }
    if(!licschet)
        throw new AnyBalance.Error("Невозможно определить номер лицевого счета. Попробуйте ввести его в настройках вручную.");
    
    var reSchet = new RegExp("__doPostBack\\('([^']*)','([^']*)'\\)\">" + licschet + "<\\/a>");
    if(!(matches = reSchet.exec(html)))
        throw new AnyBalance.Error("Лицевой счет №"+licschet + " не найден");
    
    var controlview = getParam(html, null, null, /__gvctl00_MainContent_tableControl_view\.callback\(&quot;(.*?)&quot;\)/) || '';
    AnyBalance.trace('Constructed controlview: ' + controlview);
    
    var html = AnyBalance.requestPost(baseurl + "pa-management.aspx", {
        __EVENTTARGET: matches[1],
        __EVENTARGUMENT:matches[2],
        __LASTFOCUS: '',
        __gvctl00_MainContent_tableControl_view__hidden: controlview,
        __VIEWSTATE: viewstate,
        __EVENTVALIDATION: eventval,
        "ctl00$MainContent$tableControl$PANumbers":"",
        "ctl00$MainContent$tableControl$PhoneNumbers":"",
        id:'HasService',
        "ctl00$MainContent$tableControl$FilterConditions":"",
        "ctl00_MainContent_tableControl_CollapsableBlock1_state": 0,
        "ctl00$MainContent$tableControl$CorpDataTypeList": "Default",
        "ctl00$MainContent$tableControl$GroupOperationList": 1
    });
    
    //Проверим, получили ли инфу по счету
    if(matches = /<div class="b_error">([\s\S]*?)<\/div>/.exec(html))
        throw new AnyBalance.Error(matches[1].replace(/<[^>]*>/g, ''));

    if(html.indexOf(licschet + "</h1>") < 0)
        throw new AnyBalance.Error("Невозможно получить информацию по лицевому счету. Обратитесь к автору.");
    
    var result = {success: true}
    result.__tariff = 'л/c:' + licschet;
    getParam(html, result, "balance", /Актуальный баланс:[\s\S]*?(\d[\d.,]*)/, [",", "."], parseFloat);
    getParam(html, result, "average_speed", /Средняя скорость расходования средств по лицевому счету:[\s\S]*?(\d[\d.,]*)/, [",", "."], parseFloat);
    getParam(html, result, "phones", /Список телефонов лицевого счета \((\d+)\)/, null, parseInt);

    AnyBalance.setResult(result);
}
