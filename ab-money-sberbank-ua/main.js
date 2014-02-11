/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html, application/xml;q=0.9, application/xhtml+xml, image/png, image/webp, image/jpeg, image/gif, image/x-xbitmap, */*;q=0.1',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.9,ru-RU;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://online.oschadnybank.com/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.oschadnybank.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введіть логін!');
	checkEmpty(prefs.password, 'Введіть пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'frontend/frontend', g_headers);
	
	var execKey = getParam(html, null, null, /execution=([\s\S]{4})/i);
	var href = getParam(html, null, null, /id="FORM_FAST_LOGIN"[^>]*action="\/([^"]*)/i);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'Login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		else if (name == '_flowExecutionKey')
			return execKey;
		return value;
	});
	html = AnyBalance.requestPost(baseurl + href, params, addHeaders({Referer: baseurl + 'frontend/auth/userlogin?execution=' + execKey}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Смена Пароля(?:[\s\S]*?<[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error(error);
		error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);

		if (error) 
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не вдалося зайти в особистий кабінет. Сайт змінено?');
	}
	if (prefs.type == 'acc') 
		fetchAcc(html);
	else 
		fetchCard(html, baseurl);
}

function getSID(html) {
	var sid = getParam(html, null, null, /'SID'[^>]*value='([^']*)/i, replaceTagsAndSpaces, html_entity_decode);
	return sid;
}

function fetchCard(html, baseurl) {

	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо вказати 4 останніх цифри карти або не вказувати нічого");


	var result = {success: true};
	

	var cardnum = prefs.lastdigits || '\\d{4}';

	var regExp = new RegExp('<!-- @CARDS -->[\\s\\S]*?'+ cardnum+'\\s*<[\\s\\S]*?<!--/ .owwb-ws-cards-accounts -->','i');
	
	var root = getParam(html, null, null, regExp);
AnyBalance.trace(html);
	if(!root){
		throw new AnyBalance.Error('Не вдалося знайти ' + (prefs.lastdigits ? 'карту с останніми цифрами ' + prefs.lastdigits : 'ні однієї карти!'));
	}
	
	      getParam(root, result, 'balance', /(?:Доступно:)(?:\s)(\d+\.\d{2})/i, replaceTagsAndSpaces, parseBalance);
        getParam(root, result, 'maxlimit', /(?:Кредитний ліміт:)(?:\s)(\d+\.\d{2})/i, replaceTagsAndSpaces, parseBalance);

	if (prefs.dz=='mmyy') getParam(root, result, 'till', /(?:Дата закінчення дії)(?:[\s\S]*)((січень|лютий|березень|квітень|травень|червень|липень|серпень|вересень|жовтень|листопад|грудень)(\s\d{4}))/i, replaceTagsAndSpaces);
        else {
        var mm=getParam(root, null, null, /(?:Дата закінчення дії)(?:[\s\S]*)(січень|лютий|березень|квітень|травень|червень|липень|серпень|вересень|жовтень|листопад|грудень)(\s\d{4})/i, replaceTagsAndSpaces);
        var yy=getParam(root, null, null, /(?:Дата закінчення дії)(?:[\s\S]*)((січень|лютий|березень|квітень|травень|червень|липень|серпень|вересень|жовтень|листопад|грудень)(\s\d{4}))/i, replaceTagsAndSpaces); 
        getDz(mm,yy,result, 'till')   
             } 

        getParam(root, result, 'debt', /(?:Загальна заборгованість)(?:[\s\S]*)(\d+\.\d{2})(?:&nbsp;)/i, replaceTagsAndSpaces, parseBalance);
        getParam(root, result, 'rr', /((2625\d+)(_*)(\d+))/i, replaceTagsAndSpaces);

	getParam(root, result, 'currency', /(?:amount-currency..)(.{3})/i, replaceTagsAndSpaces);
	getParam(root, result, '__tariff', /(\d{4}\*+\d{4})/i);

  getParam(root, result, 'fio', /(?:<span class="owwb-ws-header-user-name">)(?:[\s\S]*i>)((.*)(?:&nbsp;)(.*)(?:<))/i, replaceTagsAndSpaces);    
  
	result.cardNumber = result.__tariff;

	AnyBalance.setResult(result);
}

function fetchAcc(html) {
	throw new AnyBalance.Error('Получение данных по счетам еще не поддерживается, свяжитесь с автором провайдера!');
}


function getDz (mm, yy,result, param) {

var mList = ['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
var m,y;
for(var i=0; i<mList.length; i++) {
 if (mList[i]==mm)m=i+1;
}

if (m.length=1)m='0'+m;
y=yy.substring(yy.indexOf(' ')+1)
value=m+'.'+y;
result[param] = value;
	return value;
}