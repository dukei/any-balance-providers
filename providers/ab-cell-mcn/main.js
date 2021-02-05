var g_apiHeaders = {
    Connection: 'keep-alive',
	Accept: 'application/json, text/plain, */*',
	Origin: 'https://my.vodafone.ua',
	'Accept-Encoding': null,
	'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0; ONEPLUS A3010 Build/OPR6.170623.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Crosswalk/18.48.477.13 Mobile Safari/537.36',
	'Content-Type': 'application/manifest+json; charset=UTF-8'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl='https://lk.mcn.ru/';
    var html=AnyBalance.requestPost(baseurl+'core/auth/login_post',{email:prefs.login, password:prefs.password});
    var json=getJson(html);
    if (!json.user_id) {
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Авторизация не удалась. Проверьте логин и пароль',false,true);
    	}
    AnyBalance.setDefaultCharset('utf-8');
    var result = {success: true};
    html=AnyBalance.requestPost(baseurl+'lk/account_info/read?__lk_account_info',{});
    json=getJson(html);
    result.balance=json.balance;
    result.credit=json.credit;
    result.ls=json.id;
    html=AnyBalance.requestPost(baseurl+'lk/voip/read?__lk_voip',{page_number:1,limit_per_page:100});
    json=getJson(html);
    for(let i=0; i<json.length; ++i){
    	if (!json[i].id) continue;
    	var phone=json[i];
    	let voip_number=phone.voip_number.toString().replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})/,'+$1($2)$3-$4-$5');
    	getParam(voip_number,result,'tel'+i);
    	result['pretel'+i]=prefs.needPref&&voip_number?voip_number+': ':'';
    	getParam(parseDat(phone.deactivate_future_date),result,'deactivate_future_date'+i);
    	getParam(phone.tariffs.map(function(s) { return s.name }).join(', '),result,"tariff"+i);
    	var bytes_amount=0;
    	var bytes_consumed=0;
    	phone.internet_packages.forEach(function(pakage, index) {bytes_amount+=pakage.bytes_amount/1024/1024;bytes_consumed+=pakage.bytes_consumed/1024/1024});
    	getParam((bytes_amount-bytes_consumed).toFixed(2),result,"inet"+i,null, null,parseFloat);
    	getParam((bytes_amount?'/'+bytes_amount.toFixed(0)+' МБ':' МБ'),result,"suf_inet"+i);
    }
    AnyBalance.setResult(result);
}
function parseDat(str){
        var matches = /(\d*)-(\d*)-(\d*)/.exec(str);
        if (matches) {
            var date = new Date(matches[1], matches[2] - 1, matches[3]);
            var time = date.getTime();
            AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
            return time;
        }
}
