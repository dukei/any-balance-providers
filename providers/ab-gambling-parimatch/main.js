/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'x-clientid':'cd61e45ab27ce84d85731826a8b8b606',
	'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.106 Safari/537.36',
	'x-channel':'DESKTOP_AIR_PM',
	'content-type':'application/json; charset=UTF-8',
	'accept':'application/json',
	'x-requested-with':'XMLHttpRequest',
	'accept-language':'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6'
};

function main(){

    AnyBalance.setDefaultCharset('utf-8'); 
    var prefs = AnyBalance.getPreferences();
    var token=AnyBalance.getData(prefs.login+'token');
    if (!token) {
    	AnyBalance.trace('Нужна авторизация');
    	var json=login();
    }else{
    	AnyBalance.trace('Найден токен');
    	g_headers.authorization='Token '+ token;
    	var json=callApi('v2/user/getAccountInfo');
    }
    AnyBalance.trace(JSON.stringify(json));
    var result = {success: true};

    getParam(json.restOfSum, result, 'balance', null, null, parseBalance);
    getParam(json.restOfNCalc, result, 'restOfNCalc', null, null, parseBalance);
    getParam(json.restOfNPay, result, 'restOfNPay', null, null, parseBalance);
    sumParam(json.evaBonusBalance, result, 'bonus', null, null, parseBalance, aggregate_sum);
    sumParam(json.sportBonusBalance, result, 'bonus', null, null, parseBalance, aggregate_sum);
    getParam(getCurrencyByCode(json.currency.name), result, 'currency');
    AnyBalance.setResult(result);
}

function callApi(verb,params){
	if (!g_headers.authorization && verb!='RoutingLogin') login();
	var html=AnyBalance.requestPost('https://parimatch.com/api/'+verb,params, g_headers, {HTTP_METHOD: params ? 'POST' : 'GET'});
	var json=getJson(html);
	return json;
}

function login(){
	var prefs = AnyBalance.getPreferences();
	var json=callApi('RoutingLogin',JSON.stringify({
	"login": prefs.login,
	"password": prefs.password,
	"marketingMeta": {
		"registerURL": "https://parimatch.com/ru/login"
		}
	}));
	if (json.url){
		//var html=AnyBalance.requestGet(json.url);
		//'sitekey' : '6LccSjEUAAAAANCPhaM2c-WiRxCZ5CzsjR_vd8uX',
		throw new AnyBalance.Error ('Париматч затребовал ввод капчи. Попробуйте обновить позже.', false, true)
	}
	if (!json.token) throw AnyBalance.Error('Ошибка авторизации');
	AnyBalance.setData(prefs.login+'token',json.token);
	AnyBalance.saveData();
        g_headers.authorization='Token '+ json.token;
        return json.accountInfo;
}


function getCurrencyByCode(code){
const valuts=[
{code:'UAH',codeDigits:980,name:'Украинская гривна',symbol:'₴'},
{code:'USD',codeDigits:840,name:'Доллар США',symbol:'$'},
{code:'EUR',codeDigits:978,name:'Евро',symbol:'€'},
{code:'GBP',codeDigits:826,name:'Фунт стерлингов Велико­британии',symbol:'£'},
{code:'JPY',codeDigits:392,name:'Японская йена',symbol:'¥'},
{code:'CHF',codeDigits:756,name:'Швейцарский франк',symbol:''},
{code:'CNY',codeDigits:156,name:'Китайский юань женьминьби',symbol:''},
{code:'RUB',codeDigits:643,name:'Российский рубль',symbol:'р'},
{code:'AED',codeDigits:784,name:'Дирхам ОАЭ',symbol:''},
{code:'AFN',codeDigits:971,name:'Афганский афгани',symbol:''},
{code:'ALL',codeDigits:8,name:'Албанский лек',symbol:''},
{code:'AMD',codeDigits:51,name:'Армянский драм',symbol:''},
{code:'AOA',codeDigits:973,name:'Ангольская кванза',symbol:''},
{code:'ARS',codeDigits:32,name:'Аргентинский песо',symbol:''},
{code:'AUD',codeDigits:36,name:'Австралийский доллар',symbol:''},
{code:'AZN',codeDigits:944,name:'Азербайджанский манат',symbol:''},
{code:'BDT',codeDigits:50,name:'Бангладешская така',symbol:''},
{code:'BGN',codeDigits:975,name:'Болгарский лев',symbol:''},
{code:'BHD',codeDigits:48,name:'Бахрейнский динар',symbol:''},
{code:'BIF',codeDigits:108,name:'Бурундийский франк',symbol:''},
{code:'BND',codeDigits:96,name:'Брунейский доллар',symbol:''},
{code:'BOB',codeDigits:68,name:'Боливийский боливиано',symbol:''},
{code:'BRL',codeDigits:986,name:'Бразильский реал',symbol:''},
{code:'BWP',codeDigits:72,name:'Ботсванская пула',symbol:''},
{code:'BYN',codeDigits:933,name:'Белорусский рубль',symbol:''},
{code:'CAD',codeDigits:124,name:'Канадский доллар',symbol:''},
{code:'CDF',codeDigits:976,name:'Конголезский франк',symbol:''},
{code:'CLP',codeDigits:152,name:'Чилийский песо',symbol:''},
{code:'COP',codeDigits:170,name:'Колумбийский песо',symbol:''},
{code:'CRC',codeDigits:188,name:'Костариканский колон',symbol:''},
{code:'CUP',codeDigits:192,name:'Кубинский песо',symbol:''},
{code:'CZK',codeDigits:203,name:'Чешская крона',symbol:''},
{code:'DJF',codeDigits:262,name:'Джибутийский франк',symbol:''},
{code:'DKK',codeDigits:208,name:'Датская крона',symbol:''},
{code:'DZD',codeDigits:12,name:'Алжирский динар',symbol:''},
{code:'EGP',codeDigits:818,name:'Египетский фунт',symbol:''},
{code:'ETB',codeDigits:230,name:'Эфиопский быр',symbol:''},
{code:'GEL',codeDigits:981,name:'Грузинский лари',symbol:''},
{code:'GHS',codeDigits:936,name:'Ганский седи',symbol:''},
{code:'GMD',codeDigits:270,name:'Гамбийский даласи',symbol:''},
{code:'GNF',codeDigits:324,name:'Гвинейский франк',symbol:''},
{code:'HKD',codeDigits:344,name:'Гонконгский доллар',symbol:''},
{code:'HRK',codeDigits:191,name:'Хорватская куна',symbol:''},
{code:'HUF',codeDigits:348,name:'Венгерский форинт',symbol:''},
{code:'IDR',codeDigits:360,name:'Индонезийская рупия',symbol:''},
{code:'ILS',codeDigits:376,name:'Израильский шекель',symbol:''},
{code:'INR',codeDigits:356,name:'Индийская рупия',symbol:''},
{code:'IQD',codeDigits:368,name:'Иракский динар',symbol:''},
{code:'IRR',codeDigits:364,name:'Иранский риал',symbol:''},
{code:'ISK',codeDigits:352,name:'Исландская крона',symbol:''},
{code:'JOD',codeDigits:400,name:'Иорданский динар',symbol:''},
{code:'KES',codeDigits:404,name:'Кенийский шиллинг',symbol:''},
{code:'KGS',codeDigits:417,name:'Киргизский сом',symbol:''},
{code:'KHR',codeDigits:116,name:'Камбоджийский риель',symbol:''},
{code:'KPW',codeDigits:408,name:'Северо-корейская вона (КНДР)',symbol:''},
{code:'KRW',codeDigits:410,name:'Южно-корейская вона (Корея)',symbol:''},
{code:'KWD',codeDigits:414,name:'Кувейтский динар',symbol:''},
{code:'KZT',codeDigits:398,name:'Казахский тенге',symbol:''},
{code:'LAK',codeDigits:418,name:'Лаосский кип',symbol:''},
{code:'LBP',codeDigits:422,name:'Ливанский фунт',symbol:''},
{code:'LKR',codeDigits:144,name:'Шри-ланкийская рупия',symbol:''},
{code:'LYD',codeDigits:434,name:'Ливийский динар',symbol:''},
{code:'MAD',codeDigits:504,name:'Марокканский дирхам',symbol:''},
{code:'MDL',codeDigits:498,name:'Молдовский лей',symbol:''},
{code:'MGA',codeDigits:969,name:'Малагасийский ариари',symbol:''},
{code:'MKD',codeDigits:807,name:'Македонский денар',symbol:''},
{code:'MNT',codeDigits:496,name:'Монгольский тугрик',symbol:''},
{code:'MRO',codeDigits:478,name:'Мавританская угия',symbol:''},
{code:'MUR',codeDigits:480,name:'Маврикийская рупия',symbol:''},
{code:'MVR',codeDigits:462,name:'Мальдивская руфия',symbol:''},
{code:'MWK',codeDigits:454,name:'Малавийская квача',symbol:''},
{code:'MXN',codeDigits:484,name:'Мексиканский песо',symbol:''},
{code:'MYR',codeDigits:458,name:'Малайзийский ринггит',symbol:''},
{code:'MZN',codeDigits:943,name:'Мозамбикский метикал',symbol:''},
{code:'NAD',codeDigits:516,name:'Намибийский доллар',symbol:''},
{code:'NGN',codeDigits:566,name:'Нигерийская наира',symbol:''},
{code:'NIO',codeDigits:558,name:'Никарагуанская кордоба',symbol:''},
{code:'NOK',codeDigits:578,name:'Норвежская крона',symbol:''},
{code:'NPR',codeDigits:524,name:'Непальская рупия',symbol:''},
{code:'NZD',codeDigits:554,name:'Ново­зеландский доллар',symbol:''},
{code:'OMR',codeDigits:512,name:'Оманский риал',symbol:''},
{code:'PEN',codeDigits:604,name:'Перуанский соль',symbol:''},
{code:'PHP',codeDigits:608,name:'Филиппинский песо',symbol:''},
{code:'PKR',codeDigits:586,name:'Пакистанская рупия',symbol:''},
{code:'PLN',codeDigits:985,name:'Польский злотый',symbol:''},
{code:'PYG',codeDigits:600,name:'Парагвайский гуарани',symbol:''},
{code:'QAR',codeDigits:634,name:'Катарский риал',symbol:''},
{code:'RON',codeDigits:946,name:'Новый румынский лей',symbol:''},
{code:'RSD',codeDigits:941,name:'Сербский динар',symbol:''},
{code:'SAR',codeDigits:682,name:'Саудовский риял',symbol:''},
{code:'SCR',codeDigits:690,name:'Сейшельская рупия',symbol:''},
{code:'SDG',codeDigits:938,name:'Суданский фунт',symbol:''},
{code:'SEK',codeDigits:752,name:'Шведская крона',symbol:''},
{code:'SGD',codeDigits:702,name:'Сингапурский доллар',symbol:''},
{code:'SLL',codeDigits:694,name:'Сьерра-леонский леоне',symbol:''},
{code:'SOS',codeDigits:706,name:'Сомалийский шиллинг',symbol:''},
{code:'SRD',codeDigits:968,name:'Суринамский доллар',symbol:''},
{code:'SYP',codeDigits:760,name:'Сирийский фунт',symbol:''},
{code:'SZL',codeDigits:748,name:'Свазилендский лилангени',symbol:''},
{code:'THB',codeDigits:764,name:'Таиландский бат',symbol:''},
{code:'TJS',codeDigits:972,name:'Таджикский сомони',symbol:''},
{code:'TMT',codeDigits:795,name:'Туркменский манат',symbol:''},
{code:'TND',codeDigits:788,name:'Тунисский динар',symbol:''},
{code:'TRY',codeDigits:949,name:'Новая турецкая лира',symbol:''},
{code:'TWD',codeDigits:901,name:'Тайваньский доллар',symbol:''},
{code:'TZS',codeDigits:834,name:'Танзанийский шиллинг',symbol:''},
{code:'UGX',codeDigits:800,name:'Угандийский шиллинг',symbol:''},
{code:'UYU',codeDigits:858,name:'Уругвайский песо',symbol:''},
{code:'UZS',codeDigits:860,name:'Узбекский сум',symbol:''},
{code:'VEF',codeDigits:937,name:'Венесуэльский боливар',symbol:''},
{code:'VND',codeDigits:704,name:'Вьетнамский донг',symbol:''},
{code:'XAF',codeDigits:950,name:'Франк КФА (Центральная Африка)',symbol:''},
{code:'XDR',codeDigits:960,name:'СПЗ',symbol:''},
{code:'XOF',codeDigits:952,name:'Франк КФА (Западная Африка)',symbol:''},
{code:'YER',codeDigits:886,name:'Йеменский риал',symbol:''},
{code:'ZAR',codeDigits:710,name:'Южно-африканский рэнд',symbol:''},
{code:'ZMK',codeDigits:894,name:'Замбийская квача',symbol:''}];

const valutSymbols={
UAH:{symbol:'₴',symbol2:'грн.'},
USD:{symbol:'$'},
EUR:{symbol:'€'},
GBP:{symbol:'£'},
JPY:{symbol:'¥'},
CNY:{symbol:'¥'},
RUB:{symbol:'₽',symbol2:'руб.'},
ILS:{symbol:'₪'},
INR:{symbol:'₨'},
KRW:{symbol:'₩'},
NGN:{symbol:'₦'},
THB:{symbol:'฿'},
VND:{symbol:'₫'},
LAK:{symbol:'₭'},
KHR:{symbol:'៛'},
MNT:{symbol:'₮'},
PHP:{symbol:'₱'},
CRC:{symbol:'₡'},
PYG:{symbol:'₲'},
AFN:{symbol:'؋'},
GHS:{symbol:'₵'},
KZT:{symbol:'₸'},
TRY:{symbol:'₺'},
AZN:{symbol:'₼'},
GEL:{symbol:'₾'},
PLN:{symbol:'Zł'}
};


valut=valuts.filter(function(v){return v.codeDigits==code||v.code==code});
if (!valut) return code;
valut=valut[0];
if (valutSymbols[valut.code])
	return valutSymbols[valut.code].symbol2||valutSymbols[valut.code].symbol;
else 
	return valut.symbol||valut.code;
}